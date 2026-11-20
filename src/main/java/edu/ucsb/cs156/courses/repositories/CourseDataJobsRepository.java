package edu.ucsb.cs156.courses.repositories;

import java.util.Collection;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Queries the job library's existing table without adding another entity or schema migration. */
@Repository
@RequiredArgsConstructor
public class CourseDataJobsRepository {
  private final NamedParameterJdbcTemplate jdbc;

  public boolean existsByJobNameAndStatusIn(String jobName, Collection<String> statuses) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "select exists (select 1 from jobs where job_name = :name and status in (:statuses))",
            Map.of("name", jobName, "statuses", statuses),
            Boolean.class));
  }

  public void failQueuedSubmission(String name) {
    jdbc.update(
        "update jobs set status = 'failed' where job_name = :name and status = 'queued'",
        Map.of("name", name));
  }
}
