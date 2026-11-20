package edu.ucsb.cs156.courses.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import edu.ucsb.cs156.courses.controllers.JobsController;
import edu.ucsb.cs156.courses.entities.UCSBSubject;
import edu.ucsb.cs156.courses.entities.User;
import edu.ucsb.cs156.courses.jobs.MissingCourseDataJob;
import edu.ucsb.cs156.courses.jobs.UpdateCourseDataJob;
import edu.ucsb.cs156.courses.jobs.UpdateCourseDataJobFactory;
import edu.ucsb.cs156.courses.repositories.CourseDataJobsRepository;
import edu.ucsb.cs156.courses.repositories.UCSBSubjectRepository;
import edu.ucsb.cs156.courses.repositories.UserRepository;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

class CourseDataLoadServiceTests {
  UCSBSubjectRepository subjects = mock(UCSBSubjectRepository.class);
  UpdateService updates = mock(UpdateService.class);
  CourseDataJobsRepository jobs = mock(CourseDataJobsRepository.class);
  UpdateCourseDataJobFactory factory = mock(UpdateCourseDataJobFactory.class);
  JobService jobService = mock(JobService.class);
  CourseDataLoadService loader =
      new CourseDataLoadService(subjects, updates, jobs, factory, jobService);
  String name = "Load missing course data: MATH 20222";
  List<String> active = List.of("queued", "running", "cancelling");

  @BeforeEach
  void setUp() {
    when(subjects.lockSubject("MATH"))
        .thenReturn(Optional.of(UCSBSubject.builder().subjectCode("MATH").build()));
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  private SecurityContext requestContext(boolean authenticated) {
    var context = SecurityContextHolder.createEmptyContext();
    if (authenticated) {
      var authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
      var principal =
          new DefaultOAuth2User(
              authorities,
              Map.of("sub", "google-subject", "email", "user@ucsb.edu", "email_verified", true),
              "sub");
      context.setAuthentication(new OAuth2AuthenticationToken(principal, authorities, "google"));
    }
    SecurityContextHolder.setContext(context);
    return context;
  }

  private JobUserProviderImpl userProvider(UserRepository users) {
    var currentUser = new CurrentUserServiceImpl();
    ReflectionTestUtils.setField(currentUser, "userRepository", users);
    var provider = new JobUserProviderImpl();
    ReflectionTestUtils.setField(provider, "currentUserService", currentUser);
    return provider;
  }

  @ParameterizedTest
  @CsvSource({"false,false", "true,false", "false,true", "true,true"})
  void automaticSubmissionUsesFreshSystemContextAndRestoresRequest(
      boolean authenticated, boolean rejected) throws Exception {
    var original = requestContext(authenticated);
    var authentication = original.getAuthentication();
    var users = mock(UserRepository.class);
    when(users.findByEmail("user@ucsb.edu"))
        .thenThrow(new IncorrectResultSizeDataAccessException(1, 2));
    var provider = userProvider(users);
    var rejection = new IllegalStateException("executor rejected job");
    when(jobService.runAsJob(any()))
        .thenAnswer(
            invocation -> {
              var system = SecurityContextHolder.getContext();
              assertNotSame(original, system);
              assertNull(system.getAuthentication());
              assertNull(provider.getCurrentUserId());
              assertNull(provider.getCurrentUserEmail());
              if (rejected) {
                throw rejection;
              }
              return Job.builder().build();
            });

    if (rejected) {
      assertSame(
          rejection,
          assertThrows(IllegalStateException.class, () -> loader.ensureLoaded("MATH", "20222")));
      verify(jobs).failQueuedSubmission(name);
    } else {
      assertFalse(loader.ensureLoaded("MATH", "20222"));
      verify(jobs, never()).failQueuedSubmission(anyString());
    }
    assertSame(original, SecurityContextHolder.getContext());
    assertSame(authentication, original.getAuthentication());
    verifyNoInteractions(users);
    verify(jobService).runAsJob(any());
  }

  @Test
  void failedSubmissionCleanupStillRestoresAuthenticatedContext() {
    var original = requestContext(true);
    when(jobService.runAsJob(any())).thenThrow(new IllegalStateException("rejected"));
    var cleanupFailure = new IllegalStateException("database unavailable");
    doThrow(cleanupFailure).when(jobs).failQueuedSubmission(name);

    assertSame(
        cleanupFailure,
        assertThrows(IllegalStateException.class, () -> loader.ensureLoaded("MATH", "20222")));
    assertSame(original, SecurityContextHolder.getContext());
    assertNotNull(original.getAuthentication());
  }

  @Test
  void manualSubmissionAfterAutomaticLoadRetainsUserAttribution() throws Exception {
    var original = requestContext(true);
    var users = mock(UserRepository.class);
    when(users.findByEmail("user@ucsb.edu"))
        .thenReturn(Optional.of(User.builder().id(42L).email("user@ucsb.edu").build()));
    var provider = userProvider(users);
    when(jobService.runAsJob(any()))
        .thenAnswer(
            invocation ->
                Job.builder()
                    .createdById(provider.getCurrentUserId())
                    .createdByEmail(provider.getCurrentUserEmail())
                    .build());

    assertFalse(loader.ensureLoaded("MATH", "20222"));
    verifyNoInteractions(users);
    assertSame(original, SecurityContextHolder.getContext());
    var controller = new JobsController();
    ReflectionTestUtils.setField(controller, "jobService", jobService);
    ReflectionTestUtils.setField(controller, "updateCourseDataJobFactory", factory);

    Job manual = controller.launchUpdateCourseDataJob("20222", "MATH", true);

    assertEquals(42L, manual.getCreatedById());
    assertEquals("user@ucsb.edu", manual.getCreatedByEmail());
    assertSame(original, SecurityContextHolder.getContext());
    verify(jobService, times(2)).runAsJob(any());
  }

  @Test
  void oldUpdateCountsAsLoadedEvenForAnEmptySearch() throws Exception {
    when(updates.getLastUpdate("MATH", "20222"))
        .thenReturn(Optional.of(LocalDateTime.of(2020, 1, 1, 0, 0)));
    assertTrue(loader.ensureLoaded("MATH", "20222"));
    verify(subjects).lockSubject("MATH");
    verifyNoInteractions(jobs, factory, jobService);
  }

  @Test
  void missingDataSubmitsCorrectJobAndDelegatesExecution() throws Exception {
    when(updates.getLastUpdate("MATH", "20222")).thenReturn(Optional.empty());
    UpdateCourseDataJob delegate = mock(UpdateCourseDataJob.class);
    when(factory.createForSubjectAndQuarterAndIfStale("MATH", "20222", true)).thenReturn(delegate);
    assertFalse(loader.ensureLoaded("MATH", "20222"));
    var captured = ArgumentCaptor.forClass(MissingCourseDataJob.class);
    verify(jobService).runAsJob(captured.capture());
    assertEquals(name, captured.getValue().getJobName());
    verify(jobs).existsByJobNameAndStatusIn(name, active);
    JobContext context = mock(JobContext.class);
    captured.getValue().accept(context);
    verify(delegate).accept(context);
    // Completion without a freshness record (e.g. failed index preparation) permits another try.
    assertFalse(loader.ensureLoaded("MATH", "20222"));
    verify(jobService, times(2)).runAsJob(any());
  }

  @Test
  void activeJobPreventsDuplicateSubmission() throws Exception {
    when(jobs.existsByJobNameAndStatusIn(name, active)).thenReturn(true);
    assertFalse(loader.ensureLoaded("MATH", "20222"));
    verifyNoInteractions(jobService);
  }

  @Test
  void rejectedSubmissionIsReportedAndQueuedRowDoesNotSuppressRetries() throws Exception {
    var failure = new IllegalStateException("executor rejected job");
    when(jobService.runAsJob(any())).thenThrow(failure);
    assertSame(
        failure,
        assertThrows(IllegalStateException.class, () -> loader.ensureLoaded("MATH", "20222")));
    verify(jobs).failQueuedSubmission(name);
    doReturn(null).when(jobService).runAsJob(any());
    assertFalse(loader.ensureLoaded("MATH", "20222"));
    verify(jobService, times(2)).runAsJob(any());
  }

  @Test
  void unknownSubjectCannotLaunchJob() {
    when(subjects.lockSubject("MATH")).thenReturn(Optional.empty());
    assertThrows(IllegalArgumentException.class, () -> loader.ensureLoaded("MATH", "20222"));
    verifyNoInteractions(updates, jobs, factory, jobService);
  }

  @Test
  void metadataFailureDoesNotSubmitJob() throws Exception {
    when(updates.getLastUpdate("MATH", "20222"))
        .thenThrow(new IllegalStateException("Mongo unavailable"));
    assertThrows(IllegalStateException.class, () -> loader.ensureLoaded("MATH", "20222"));
    verifyNoInteractions(jobs, factory, jobService);
  }
}
