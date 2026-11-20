package edu.ucsb.cs156.courses.controllers;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import edu.ucsb.cs156.courses.ControllerTestCase;
import edu.ucsb.cs156.courses.services.CourseDataAvailabilityService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(CourseDataAvailabilityController.class)
class CourseDataAvailabilityControllerTests extends ControllerTestCase {
  @MockitoBean CourseDataAvailabilityService availability;
  @MockitoBean edu.ucsb.cs156.courses.repositories.UserRepository userRepository;

  @Test
  void anonymousSubjectSearchCanScheduleAndReceiveWarnings() throws Exception {
    var warnings = List.of("MATH 20222 missing; check back in 5 minutes");
    when(availability.warnings("20222", "20223", "MATH")).thenReturn(warnings);
    mockMvc
        .perform(
            post("/api/public/course-data/ensure")
                .with(csrf())
                .param("startQtr", "20222")
                .param("endQtr", "20223")
                .param("subjectArea", "MATH"))
        .andExpect(status().isOk())
        .andExpect(content().json(mapper.writeValueAsString(warnings)));
    verify(availability).warnings("20222", "20223", "MATH");
  }

  @Test
  void searchWithoutSubjectChecksAllSubjects() throws Exception {
    when(availability.warnings("20222", "20222", null)).thenReturn(List.of());
    mockMvc
        .perform(
            post("/api/public/course-data/ensure")
                .with(csrf())
                .param("startQtr", "20222")
                .param("endQtr", "20222"))
        .andExpect(status().isOk())
        .andExpect(content().json("[]"));
    verify(availability).warnings("20222", "20222", null);
  }

  @Test
  void missingParametersDoNotLaunchJobs() throws Exception {
    mockMvc
        .perform(post("/api/public/course-data/ensure").with(csrf()))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(availability);
  }

  @Test
  void schedulingRequiresCsrf() throws Exception {
    mockMvc
        .perform(
            post("/api/public/course-data/ensure")
                .param("startQtr", "20222")
                .param("endQtr", "20222"))
        .andExpect(status().isForbidden());
    verifyNoInteractions(availability);
  }
}
