package edu.ucsb.cs156.courses.services;

import edu.ucsb.cs156.courses.jobs.MissingCourseDataJob;
import edu.ucsb.cs156.courses.jobs.UpdateCourseDataJobFactory;
import edu.ucsb.cs156.courses.repositories.CourseDataJobsRepository;
import edu.ucsb.cs156.courses.repositories.UCSBSubjectRepository;
import edu.ucsb.cs156.jobs.services.JobService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseDataLoadService {
  private final UCSBSubjectRepository subjects;
  private final UpdateService updates;
  private final CourseDataJobsRepository jobs;
  private final UpdateCourseDataJobFactory factory;
  private final JobService jobService;

  /**
   * Serialize the short check/submit step across app instances using the existing subject row.
   * JobService commits its queued row in a separate transaction before returning. READ_COMMITTED
   * ensures the next lock holder sees that job. No course retrieval happens in this transaction.
   * Terminal jobs do not suppress retries, and an old update still counts as loaded data.
   */
  @Transactional(isolation = Isolation.READ_COMMITTED, noRollbackFor = Exception.class)
  public boolean ensureLoaded(String subject, String quarter) throws Exception {
    subjects
        .lockSubject(subject)
        .orElseThrow(() -> new IllegalArgumentException("Unknown subject"));
    if (updates.getLastUpdate(subject, quarter).isPresent()) {
      return true;
    }
    var job =
        new MissingCourseDataJob(
            subject, quarter, factory.createForSubjectAndQuarterAndIfStale(subject, quarter, true));
    if (!jobs.existsByJobNameAndStatusIn(
        job.getJobName(), List.of("queued", "running", "cancelling"))) {
      var originalContext = SecurityContextHolder.getContext();
      try {
        // Shared cache fills are system jobs; user attribution must not require an OAuth lookup.
        SecurityContextHolder.setContext(SecurityContextHolder.createEmptyContext());
        jobService.runAsJob(job);
      } catch (RuntimeException e) {
        // The library commits the queued row before dispatching to its executor. If dispatch
        // fails, do not leave a queued row that would suppress every future retry.
        jobs.failQueuedSubmission(job.getJobName());
        throw e;
      } finally {
        SecurityContextHolder.setContext(originalContext);
      }
    }
    return false;
  }
}
