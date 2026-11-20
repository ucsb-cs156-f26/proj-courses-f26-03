package edu.ucsb.cs156.courses.jobs;

import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;

/** A stable name lets concurrent searches recognize the same subject/quarter load. */
public record MissingCourseDataJob(String subject, String quarter, JobContextConsumer delegate)
    implements JobContextConsumer {
  @Override
  public String getJobName() {
    return "Load missing course data: " + subject + " " + quarter;
  }

  @Override
  public void accept(JobContext context) throws Exception {
    delegate.accept(context);
  }
}
