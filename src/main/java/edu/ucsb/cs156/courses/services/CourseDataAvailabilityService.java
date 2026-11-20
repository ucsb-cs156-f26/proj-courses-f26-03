package edu.ucsb.cs156.courses.services;

import edu.ucsb.cs156.courses.models.Quarter;
import edu.ucsb.cs156.courses.repositories.UCSBSubjectRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseDataAvailabilityService {
  private final UCSBSubjectRepository subjects;
  private final CourseDataLoadService loader;

  /**
   * Missing metadata, not empty search results, triggers a load. Null subject means all subjects.
   */
  public List<String> warnings(String start, String end, String subject) {
    List<String> requestedSubjects = new ArrayList<>();
    if (subject == null) {
      subjects.findAll().forEach(s -> requestedSubjects.add(s.getSubjectCode()));
    } else {
      requestedSubjects.add(subject.strip().toUpperCase(java.util.Locale.ROOT));
    }
    if (requestedSubjects.isEmpty()) {
      throw new IllegalStateException("Subject catalog is unavailable");
    }
    List<String> warnings = new ArrayList<>();
    for (Quarter quarter : Quarter.quarterList(start, end)) {
      for (String code : requestedSubjects) {
        String data = "Course data for " + code + " in quarter " + quarter.getYYYYQ();
        try {
          if (!loader.ensureLoaded(code, quarter.getYYYYQ())) {
            warnings.add(
                data
                    + " has not been loaded. A background update is scheduled or already running. Please check back in 5 minutes.");
          }
        } catch (Exception e) {
          log.error("Unable to schedule missing course data for {} {}", code, quarter, e);
          warnings.add(
              data + " could not be loaded or scheduled. Please try searching again later.");
        }
      }
    }
    return warnings;
  }
}
