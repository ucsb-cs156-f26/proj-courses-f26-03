package edu.ucsb.cs156.courses.repositories;

import edu.ucsb.cs156.courses.entities.UCSBSubject;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UCSBSubjectRepository extends CrudRepository<UCSBSubject, String> {
  // Explicit FOR UPDATE works with PostgreSQL and the development H2 database, even when
  // development uses PostgreSQLDialect (whose generated FOR NO KEY UPDATE is unsupported by H2).
  @Query(
      value = "select * from ucsb_subjects where subject_code = :subject for update",
      nativeQuery = true)
  Optional<UCSBSubject> lockSubject(@Param("subject") String subject);
}
