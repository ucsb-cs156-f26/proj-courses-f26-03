package edu.ucsb.cs156.courses.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import edu.ucsb.cs156.courses.entities.UCSBSubject;
import edu.ucsb.cs156.courses.jobs.UpdateCourseDataJobFactory;
import edu.ucsb.cs156.courses.repositories.CourseDataJobsRepository;
import edu.ucsb.cs156.courses.repositories.UCSBSubjectRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import edu.ucsb.cs156.jobs.services.JobService;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Real SQL transactions verify the lock and active-job queries, not an in-memory imitation. */
@DataJpaTest(showSql = false)
@EntityScan(basePackageClasses = {UCSBSubject.class, Job.class})
@Import({CourseDataLoadService.class, CourseDataJobsRepository.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class CourseDataLoadConcurrencyTests {
  @Autowired CourseDataLoadService loader;
  @Autowired UCSBSubjectRepository subjects;
  @Autowired CourseDataJobsRepository jobs;
  @Autowired EntityManager em;
  @Autowired PlatformTransactionManager manager;
  @MockitoBean UpdateService updates;
  @MockitoBean UpdateCourseDataJobFactory factory;
  @MockitoBean JobService jobService;
  TransactionTemplate transaction;
  String name = "Load missing course data: MATH 20222";

  @BeforeEach
  void setUp() throws Exception {
    transaction = new TransactionTemplate(manager);
    transaction.setPropagationBehavior(TransactionTemplate.PROPAGATION_REQUIRES_NEW);
    transaction.executeWithoutResult(
        status -> {
          em.createQuery("delete from jobs").executeUpdate();
          subjects.save(UCSBSubject.builder().subjectCode("MATH").build());
        });
    when(updates.getLastUpdate(anyString(), anyString())).thenReturn(Optional.empty());
  }

  Job saveJob(String jobName, String status) {
    return transaction.execute(
        tx -> {
          Job job = Job.builder().jobName(jobName).status(status).build();
          em.persist(job);
          em.flush();
          return job;
        });
  }

  @Test
  void concurrentSearchesSubmitOnceAndDifferentQuartersRemainIndependent() throws Exception {
    var submitted = new CountDownLatch(1);
    var release = new CountDownLatch(1);
    when(jobService.runAsJob(any()))
        .thenAnswer(
            invocation -> {
              submitted.countDown();
              assertTrue(release.await(5, TimeUnit.SECONDS));
              return saveJob(
                  ((JobContextConsumer) invocation.getArgument(0)).getJobName(), "queued");
            });
    var executor = Executors.newFixedThreadPool(2);
    try {
      var first = executor.submit(() -> loader.ensureLoaded("MATH", "20222"));
      assertTrue(submitted.await(5, TimeUnit.SECONDS));
      var second = executor.submit(() -> loader.ensureLoaded("MATH", "20222"));
      assertThrows(TimeoutException.class, () -> second.get(200, TimeUnit.MILLISECONDS));
      verify(jobService).runAsJob(any());
      release.countDown();
      assertFalse(first.get(5, TimeUnit.SECONDS));
      assertFalse(second.get(5, TimeUnit.SECONDS));
      verify(jobService).runAsJob(any());
      assertFalse(loader.ensureLoaded("MATH", "20223"));
      verify(jobService, times(2)).runAsJob(any());
    } finally {
      release.countDown();
      executor.shutdownNow();
      assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
    }
  }

  @Test
  void activeStatesPreventDuplicatesButTerminalStatesAllowRetry() throws Exception {
    for (String status : List.of("queued", "running", "cancelling")) {
      Job job = saveJob(name, status);
      assertFalse(loader.ensureLoaded("MATH", "20222"));
      transaction.executeWithoutResult(tx -> em.remove(em.find(Job.class, job.getId())));
    }
    verify(jobService, never()).runAsJob(any());
    for (String status : List.of("complete", "failed", "cancelled")) {
      saveJob(name, status);
    }
    saveJob("Load missing course data: CMPSC 20222", "queued");
    assertFalse(loader.ensureLoaded("MATH", "20222"));
    verify(jobService).runAsJob(any());
  }

  @Test
  void dispatchFailureMarksOnlyItsQueuedRowFailedAndAllowsRetry() throws Exception {
    Job other = saveJob("other job", "queued");
    Job running = saveJob(name, "running");
    transaction.executeWithoutResult(tx -> jobs.failQueuedSubmission(name));
    assertEquals(
        "queued", transaction.execute(tx -> em.find(Job.class, other.getId()).getStatus()));
    assertEquals(
        "running", transaction.execute(tx -> em.find(Job.class, running.getId()).getStatus()));
    transaction.executeWithoutResult(tx -> em.remove(em.find(Job.class, running.getId())));
    when(jobService.runAsJob(any()))
        .thenAnswer(
            invocation -> {
              saveJob(name, "queued");
              throw new IllegalStateException("executor rejected submission");
            });
    assertThrows(IllegalStateException.class, () -> loader.ensureLoaded("MATH", "20222"));
    assertFalse(jobs.existsByJobNameAndStatusIn(name, List.of("queued")));
    assertTrue(jobs.existsByJobNameAndStatusIn(name, List.of("failed")));
    doAnswer(invocation -> saveJob(name, "queued")).when(jobService).runAsJob(any());
    assertFalse(loader.ensureLoaded("MATH", "20222"));
    verify(jobService, times(2)).runAsJob(any());
  }
}
