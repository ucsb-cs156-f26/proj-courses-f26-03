package edu.ucsb.cs156.courses.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import edu.ucsb.cs156.courses.entities.UCSBSubject;
import edu.ucsb.cs156.courses.repositories.UCSBSubjectRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class CourseDataAvailabilityServiceTests {
  UCSBSubjectRepository subjects = mock(UCSBSubjectRepository.class);
  CourseDataLoadService loader = mock(CourseDataLoadService.class);
  CourseDataAvailabilityService service = new CourseDataAvailabilityService(subjects, loader);

  String missing(String subject, String quarter) {
    return "Course data for "
        + subject
        + " in quarter "
        + quarter
        + " has not been loaded. A background update is scheduled or already running. Please check back in 5 minutes.";
  }

  @Test
  void subjectSearchChecksEveryQuarterAndNormalizesSubject() throws Exception {
    when(loader.ensureLoaded("MATH", "20224")).thenReturn(true);
    assertEquals(List.of(missing("MATH", "20231")), service.warnings("20224", "20231", " math "));
    verify(loader).ensureLoaded("MATH", "20224");
    verify(loader).ensureLoaded("MATH", "20231");
    verifyNoMoreInteractions(loader);
    verifyNoInteractions(subjects);
  }

  @Test
  void crossSubjectSearchChecksEverySubjectIncludingThoseWithNoMatches() throws Exception {
    when(subjects.findAll())
        .thenReturn(
            List.of(
                UCSBSubject.builder().subjectCode("MATH").build(),
                UCSBSubject.builder().subjectCode("CMPSC").build()));
    when(loader.ensureLoaded("CMPSC", "20222")).thenReturn(true);
    assertEquals(List.of(missing("MATH", "20222")), service.warnings("20222", "20222", null));
    verify(loader).ensureLoaded("CMPSC", "20222");
    verify(loader).ensureLoaded("MATH", "20222");
    verifyNoMoreInteractions(loader);
  }

  @Test
  void submissionFailureWarnsHonestlyAndOtherMissingPairsStillSchedule() throws Exception {
    when(loader.ensureLoaded("MATH", "20222")).thenThrow(new IllegalStateException("rejected"));
    assertEquals(
        List.of(
            "Course data for MATH in quarter 20222 could not be loaded or scheduled. Please try searching again later.",
            missing("MATH", "20223")),
        service.warnings("20222", "20223", "MATH"));
  }

  @Test
  void loadedDataNeedsNoWarning() throws Exception {
    when(loader.ensureLoaded("MATH", "20222")).thenReturn(true);
    assertEquals(List.of(), service.warnings("20222", "20222", "MATH"));
  }

  @Test
  void missingSubjectCatalogCannotBeTreatedAsCompleteCoverage() {
    when(subjects.findAll()).thenReturn(List.of());
    assertThrows(IllegalStateException.class, () -> service.warnings("20222", "20222", null));
    verifyNoInteractions(loader);
  }
}
