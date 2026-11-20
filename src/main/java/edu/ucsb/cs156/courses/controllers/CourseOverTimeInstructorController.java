package edu.ucsb.cs156.courses.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ucsb.cs156.courses.collections.ConvertedSectionCollection;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import edu.ucsb.cs156.courses.documents.Primary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/courseovertime")
public class CourseOverTimeInstructorController {

  private ObjectMapper mapper = new ObjectMapper();

  @Autowired ConvertedSectionCollection convertedSectionCollection;

  @Operation(summary = "Get a list of courses over time, filtered by instructor name")
  @GetMapping(value = "/instructorsearch", produces = "application/json")
  public ResponseEntity<String> search(
      @Parameter(
              name = "startQtr",
              description =
                  "Starting quarter in yyyyq format, e.g. 20231 for W23, 20232 for S23, etc. (1=Winter, 2=Spring, 3=Summer, 4=Fall)",
              example = "20231",
              required = true)
          @RequestParam
          String startQtr,
      @Parameter(
              name = "endQtr",
              description =
                  "Ending quarter in yyyyq format, e.g. 20231 for W23, 20232 for S23, etc. (1=Winter, 2=Spring, 3=Summer, 4=Fall)",
              example = "20231",
              required = true)
          @RequestParam
          String endQtr,
      @Parameter(
              name = "instructor",
              description = "Instructor name; e.g. 'conrad' or 'CONRAD' or 'CONRAD P T'",
              example = "CONRAD",
              required = true)
          @RequestParam
          String instructor,
      @Parameter(
              name = "lectureOnly",
              description = "Lectures only",
              example = "true",
              required = true)
          @RequestParam
          boolean lectureOnly)
      throws JsonProcessingException {
    String functionCode = lectureOnly ? "^(Teaching and in charge)" : "^.*";
    List<ConvertedSection> matches =
        convertedSectionCollection.findByQuarterRangeAndInstructor(
            startQtr, endQtr, "^" + instructor.toUpperCase(), functionCode);

    // Discussion sections usually list only TAs, so they rarely match the instructor themselves.
    // Fetch every section of the matched courses, group them under their lectures, and keep
    // the lectures where the instructor teaches the lecture or one of its sections.
    Set<String> matchedSections =
        matches.stream()
            .map(cs -> cs.getCourseInfo().getQuarter() + cs.getSection().getEnrollCode())
            .collect(Collectors.toSet());
    List<String> courseIds =
        matches.stream().map(cs -> cs.getCourseInfo().getCourseId()).distinct().toList();

    List<Primary> primaries =
        Primary.fromConvertedSections(
                convertedSectionCollection.findByQuarterRangeAndCourseIdIn(
                    startQtr, endQtr, courseIds))
            .stream()
            .filter(
                p ->
                    Stream.concat(Stream.of(p.getPrimary()), p.getSubRows().stream())
                        .anyMatch(
                            s -> matchedSections.contains(p.getQuarter() + s.getEnrollCode())))
            .toList();

    String body = mapper.writeValueAsString(primaries);
    return ResponseEntity.ok().body(body);
  }
}
