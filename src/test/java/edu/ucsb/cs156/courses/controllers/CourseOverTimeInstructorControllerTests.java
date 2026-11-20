package edu.ucsb.cs156.courses.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ucsb.cs156.courses.ControllerTestCase;
import edu.ucsb.cs156.courses.collections.ConvertedSectionCollection;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import edu.ucsb.cs156.courses.documents.CourseInfo;
import edu.ucsb.cs156.courses.documents.Primary;
import edu.ucsb.cs156.courses.documents.Section;
import edu.ucsb.cs156.courses.repositories.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(value = CourseOverTimeInstructorController.class)
public class CourseOverTimeInstructorControllerTests extends ControllerTestCase {
  private ObjectMapper mapper = new ObjectMapper();

  @Autowired private MockMvc mockMvc;

  @MockBean ConvertedSectionCollection convertedSectionCollection;
  @MockitoBean UserRepository userRepository;

  private static final String URL_TEMPLATE =
      "/api/public/courseovertime/instructorsearch?startQtr=%s&endQtr=%s&instructor=%s&lectureOnly=%s";

  private static final String CS156 = "CMPSC   156  -1";
  private static final String CS5B = "CMPSC     5B -1";

  private static Section section(String enrollCode, String sectionNumber) {
    return Section.builder().enrollCode(enrollCode).section(sectionNumber).build();
  }

  private static CourseInfo info(String quarter, String courseId) {
    return CourseInfo.builder().quarter(quarter).courseId(courseId).title("TITLE").build();
  }

  private static ConvertedSection cs(String quarter, String courseId, Section section) {
    return ConvertedSection.builder().courseInfo(info(quarter, courseId)).section(section).build();
  }

  private static Primary primary(
      String quarter, String courseId, Section lecture, Section... subs) {
    return Primary.builder()
        .quarter(quarter)
        .courseId(courseId)
        .title("TITLE")
        .primary(lecture)
        .subRows(List.of(subs))
        .build();
  }

  private String fetch(String url) throws Exception {
    MvcResult response = mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn();
    return response.getResponse().getContentAsString();
  }

  @Test
  public void test_search_noMatches_returnsEmptyList() throws Exception {
    when(convertedSectionCollection.findByQuarterRangeAndInstructor(
            eq("20262"), eq("20262"), eq("^CONRADDD"), eq("^.*")))
        .thenReturn(List.of());
    when(convertedSectionCollection.findByQuarterRangeAndCourseIdIn(
            eq("20262"), eq("20262"), eq(List.of())))
        .thenReturn(List.of());

    String responseString =
        fetch(String.format(URL_TEMPLATE, "20262", "20262", "conraddd", "false"));

    assertEquals("[]", responseString);
  }

  @Test
  public void test_search_lectureOnly_returnsLectureWithItsDiscussionSections() throws Exception {
    Section lecture1 = section("07831", "0100");
    Section disc1a = section("07849", "0101");
    Section disc1b = section("07856", "0102");
    Section otherLecture = section("07900", "0200");
    Section otherDisc = section("07901", "0201");

    when(convertedSectionCollection.findByQuarterRangeAndInstructor(
            eq("20262"), eq("20262"), eq("^CONRAD"), eq("^(Teaching and in charge)")))
        .thenReturn(List.of(cs("20262", CS156, lecture1)));
    when(convertedSectionCollection.findByQuarterRangeAndCourseIdIn(
            eq("20262"), eq("20262"), eq(List.of(CS156))))
        .thenReturn(
            List.of(
                cs("20262", CS156, otherDisc),
                cs("20262", CS156, disc1b),
                cs("20262", CS156, otherLecture),
                cs("20262", CS156, lecture1),
                cs("20262", CS156, disc1a)));

    String responseString = fetch(String.format(URL_TEMPLATE, "20262", "20262", "conrad", "true"));

    String expectedString =
        mapper.writeValueAsString(List.of(primary("20262", CS156, lecture1, disc1a, disc1b)));
    assertEquals(expectedString, responseString);
  }

  @Test
  public void test_search_matchOnDiscussionSection_returnsWholeLecture() throws Exception {
    Section lecture = section("07831", "0100");
    Section disc1 = section("07849", "0101");
    Section disc2 = section("07856", "0102");

    when(convertedSectionCollection.findByQuarterRangeAndInstructor(
            eq("20262"), eq("20262"), eq("^JENSEN"), eq("^.*")))
        .thenReturn(List.of(cs("20262", CS156, disc1), cs("20262", CS156, disc2)));
    when(convertedSectionCollection.findByQuarterRangeAndCourseIdIn(
            eq("20262"), eq("20262"), eq(List.of(CS156))))
        .thenReturn(
            List.of(
                cs("20262", CS156, lecture), cs("20262", CS156, disc1), cs("20262", CS156, disc2)));

    String responseString = fetch(String.format(URL_TEMPLATE, "20262", "20262", "jensen", "false"));

    String expectedString =
        mapper.writeValueAsString(List.of(primary("20262", CS156, lecture, disc1, disc2)));
    assertEquals(expectedString, responseString);
  }

  @Test
  public void test_search_severalQuartersAndCourses_onlyMatchedOfferingsSortedByQuarterDesc()
      throws Exception {
    // the same enroll code can be reused in another quarter; only the matched quarter counts
    Section f25Lecture = section("07831", "0100");
    Section s26Lecture = section("07831", "0100");
    Section s26Disc = section("07849", "0101");
    Section s26Cs5b = section("12345", "0100");

    when(convertedSectionCollection.findByQuarterRangeAndInstructor(
            eq("20254"), eq("20262"), eq("^CONRAD"), eq("^.*")))
        .thenReturn(
            List.of(
                cs("20262", CS156, s26Lecture),
                cs("20262", CS5B, s26Cs5b),
                cs("20262", CS156, s26Disc)));
    when(convertedSectionCollection.findByQuarterRangeAndCourseIdIn(
            eq("20254"), eq("20262"), eq(List.of(CS156, CS5B))))
        .thenReturn(
            List.of(
                cs("20254", CS156, f25Lecture),
                cs("20262", CS5B, s26Cs5b),
                cs("20262", CS156, s26Disc),
                cs("20262", CS156, s26Lecture)));

    String responseString = fetch(String.format(URL_TEMPLATE, "20254", "20262", "conrad", "false"));

    String expectedString =
        mapper.writeValueAsString(
            List.of(primary("20262", CS5B, s26Cs5b), primary("20262", CS156, s26Lecture, s26Disc)));
    assertEquals(expectedString, responseString);
  }
}
