package edu.ucsb.cs156.courses.controllers;

import edu.ucsb.cs156.courses.services.CourseDataAvailabilityService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Separate from search results so availability failures cannot discard otherwise valid matches. */
@RestController
@RequestMapping("/api/public/course-data")
@RequiredArgsConstructor
public class CourseDataAvailabilityController {
  private final CourseDataAvailabilityService availability;

  @PostMapping("/ensure")
  public List<String> ensure(
      @RequestParam String startQtr,
      @RequestParam String endQtr,
      @RequestParam(required = false) String subjectArea) {
    return availability.warnings(startQtr, endQtr, subjectArea);
  }
}
