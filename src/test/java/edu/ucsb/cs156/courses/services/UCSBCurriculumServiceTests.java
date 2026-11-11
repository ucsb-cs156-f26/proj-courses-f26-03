package edu.ucsb.cs156.courses.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import edu.ucsb.cs156.courses.documents.CoursePage;
import edu.ucsb.cs156.courses.documents.CoursePageFixtures;
import edu.ucsb.cs156.courses.documents.PersonalSectionsFixtures;
import edu.ucsb.cs156.courses.documents.Primary;
import edu.ucsb.cs156.courses.documents.SectionFixtures;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

@RestClientTest(UCSBCurriculumService.class)
public class UCSBCurriculumServiceTests {

  @Value("${app.ucsb.api.consumer_key}")
  private String apiKey;

  @Value("${app.ucsb.api.host}")
  private String apiHost;

  @Autowired private MockRestServiceServer mockRestServiceServer;

  @Mock private RestTemplate restTemplate;

  @org.springframework.test.context.bean.override.mockito.MockitoBean
  private CourseCacheService courseCacheService;

  @Autowired private UCSBCurriculumService ucs;

  @Test
  public void test_getJSON_success() throws Exception {
    String expectedResult = "{expectedResult}";

    String subjectArea = "CMPSC";
    String quarter = "20201";
    String level = "L";

    String expectedParams =
        String.format(
            "?quarter=%s&subjectCode=%s&objLevelCode=%s&pageNumber=%d&pageSize=%d&includeClassSections=%s",
            quarter, subjectArea, level, 1, 100, "true");
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getJSON(subjectArea, quarter, level);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getJSONbyQtrEnrollCd_success() throws Exception {
    String expectedResult = PersonalSectionsFixtures.ONE_COURSE;

    String qtr = "20221";
    String enrollCd = "59501";

    String expectedURL = apiHost + "/academics/curriculums/v3/classsection/20221/59501";

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getJSONbyQtrEnrollCd(qtr, enrollCd);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getJSON_success_level_A() throws Exception {
    String expectedResult = "{expectedResult}";

    String subjectArea = "CMPSC";
    String quarter = "20201";

    String level = "A";

    String expectedParams =
        String.format(
            "?quarter=%s&subjectCode=%s&pageNumber=%d&pageSize=%d&includeClassSections=%s",
            quarter, subjectArea, 1, 100, "true");
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getJSON(subjectArea, quarter, level);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getSubjectsJSON_success() throws Exception {
    String expectedResult = "[ {deptCode: \"ANTH\"} ]";
    String expectedURL = UCSBCurriculumService.SUBJECTS_ENDPOINT.replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getSubjectsJSON();
    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getConvertedSections() throws Exception {
    String expectedResult = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;

    String subjectArea = "MATH";
    String quarter = "20222";
    String level = "L";

    String expectedParams =
        String.format(
            "?quarter=%s&subjectCode=%s&objLevelCode=%s&pageNumber=%d&pageSize=%d&includeClassSections=%s",
            quarter, subjectArea, level, 1, 100, "true");
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    ObjectMapper objectMapper = new ObjectMapper();
    List<ConvertedSection> convertedSections =
        ucs.getConvertedSections(subjectArea, quarter, level);
    List<ConvertedSection> expected =
        objectMapper.readValue(
            CoursePageFixtures.CONVERTED_SECTIONS_JSON_MATH3B,
            new TypeReference<List<ConvertedSection>>() {});

    assertEquals(expected, convertedSections);
  }

  @Test
  public void test_getSectionJSON() throws Exception {
    String expectedResult = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;

    String subjectArea = "MATH";
    String quarter = "20222";
    String level = "L";

    String expectedParams =
        String.format(
            "?quarter=%s&subjectCode=%s&objLevelCode=%s&pageNumber=%d&pageSize=%d&includeClassSections=%s",
            quarter, subjectArea, level, 1, 100, "true");
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    ObjectMapper objectMapper = new ObjectMapper();
    String convertedSectionsString = ucs.getSectionJSON(subjectArea, quarter, level);
    List<ConvertedSection> convertedSections =
        objectMapper.readValue(
            convertedSectionsString, new TypeReference<List<ConvertedSection>>() {});
    List<ConvertedSection> expected =
        objectMapper.readValue(
            CoursePageFixtures.CONVERTED_SECTIONS_JSON_MATH3B,
            new TypeReference<List<ConvertedSection>>() {});

    assertEquals(expected, convertedSections);
  }

  @Test
  public void test_getSectionsuccess() throws Exception {
    String expectedResult = SectionFixtures.SECTION_JSON_CMPSC165B;
    // String expectedResult = "expected Result";

    String enrollCode = "08268";
    String quarter = "20224";

    String expectedURL =
        UCSBCurriculumService.SECTION_ENDPOINT
            .replace("{apiHost}", apiHost)
            .replace("{quarter}", quarter)
            .replace("{enrollcode}", enrollCode);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getSection(enrollCode, quarter);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getSection_not_found() throws Exception {
    String expectedResult = "{\"error\": \"Enroll code doesn't exist in that quarter.\"}";

    String enrollCode = "08268";
    String quarter = "00000";

    String expectedURL =
        UCSBCurriculumService.SECTION_ENDPOINT
            .replace("{apiHost}", apiHost)
            .replace("{quarter}", quarter)
            .replace("{enrollcode}", enrollCode);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess("null", MediaType.APPLICATION_JSON));

    String result = ucs.getSection(enrollCode, quarter);
    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getAllSections_success() throws Exception {
    String expectedResult = SectionFixtures.SECTION_JSON_CMPSC165B;
    // String expectedResult = "expected Result";

    String enrollCode = "08268";
    String quarter = "20224";

    String expectedURL =
        UCSBCurriculumService.ALL_SECTIONS_ENDPOINT
            .replace("{apiHost}", apiHost)
            .replace("{quarter}", quarter)
            .replace("{enrollcode}", enrollCode);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "3.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getAllSections(enrollCode, quarter);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getAllSections_not_found() throws Exception {
    String expectedResult = "{\"error\": \"Enroll code doesn't exist in that quarter.\"}";

    String enrollCode = "08268";
    String quarter = "00000";

    String expectedURL =
        UCSBCurriculumService.ALL_SECTIONS_ENDPOINT
            .replace("{apiHost}", apiHost)
            .replace("{quarter}", quarter)
            .replace("{enrollcode}", enrollCode);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "3.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess("null", MediaType.APPLICATION_JSON));

    String result = ucs.getAllSections(enrollCode, quarter);
    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getFinalsInfo_success() throws Exception {
    String expectedResult = "{\"expectedResult\": \"finals info\"}";

    String enrollCode = "67421";
    String quarter = "20251";

    String expectedParams = String.format("?quarter=%s&enrollCode=%s", quarter, enrollCode);
    String expectedURL =
        (UCSBCurriculumService.FINALS_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "3.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getFinalsInfo(quarter, enrollCode);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getGeneralEducationInfo_success() throws Exception {
    // a minimal valid JSON array
    String expectedResult =
        "["
            + "{\"requirementCode\":\"A1\","
            + "\"requirementTranslation\":\"English Reading & Composition\","
            + "\"collegeCode\":\"ENGR\","
            + "\"objCode\":\"BS\","
            + "\"courseCount\":1,"
            + "\"units\":4,"
            + "\"inactive\":false}"
            + "]";

    // stub out the GET to the GE endpoint
    this.mockRestServiceServer
        .expect(requestTo(UCSBCurriculumService.GE_ENDPOINT.replace("{apiHost}", apiHost)))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getGeneralEducationInfo();
    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getRequirementCodesByCollege_filtersAndDistinct() throws Exception {
    // JSON containing mixed collegeCodes, with a duplicate A1
    String fakeJson =
        "["
            + "{\"requirementCode\":\"A1\",\"requirementTranslation\":\"…\",\"collegeCode\":\"ENGR\",\"objCode\":\"BS\",\"courseCount\":1,\"units\":4,\"inactive\":false},"
            + "{\"requirementCode\":\"B1\",\"requirementTranslation\":\"…\",\"collegeCode\":\"L&S\",\"objCode\":\"BA\",\"courseCount\":1,\"units\":4,\"inactive\":false},"
            + "{\"requirementCode\":\"A1\",\"requirementTranslation\":\"…\",\"collegeCode\":\"ENGR\",\"objCode\":\"BS\",\"courseCount\":1,\"units\":4,\"inactive\":false},"
            + "{\"requirementCode\":\"A2\",\"requirementTranslation\":\"…\",\"collegeCode\":\"ENGR\",\"objCode\":\"BS\",\"courseCount\":1,\"units\":4,\"inactive\":false}"
            + "]";

    // stub the same GE endpoint
    this.mockRestServiceServer
        .expect(requestTo(UCSBCurriculumService.GE_ENDPOINT.replace("{apiHost}", apiHost)))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(fakeJson, MediaType.APPLICATION_JSON));

    // invoke the filter
    List<String> codes = ucs.getRequirementCodesByCollege("ENGR");
    assertEquals(List.of("A1", "A2"), codes);
  }

  @Test
  public void test_getPrimaries() throws Exception {

    // arrange
    ObjectMapper objectMapper = new ObjectMapper();

    String expectedCoursePageJSON = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage expectedCoursePage =
        objectMapper.readValue(expectedCoursePageJSON, CoursePage.class);
    List<Primary> expectedConvertedPrimaries = expectedCoursePage.getPrimaries();

    String subjectArea = "MATH";
    String quarter = "20222";
    String level = "L";

    String expectedParams =
        String.format(
            "?quarter=%s&subjectCode=%s&objLevelCode=%s&pageNumber=%d&pageSize=%d&includeClassSections=%s",
            quarter, subjectArea, level, 1, 100, "true");
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedCoursePageJSON, MediaType.APPLICATION_JSON));

    List<Primary> result = ucs.getPrimaries(subjectArea, quarter, level);
    assertEquals(expectedConvertedPrimaries, result);
    org.mockito.Mockito.verify(courseCacheService, org.mockito.Mockito.times(14))
        .upsertSection(org.mockito.ArgumentMatchers.any());
    org.mockito.Mockito.verify(courseCacheService).prepareIndex();
    for (ConvertedSection section : expectedCoursePage.convertedSections()) {
      org.mockito.Mockito.verify(courseCacheService).upsertSection(section);
    }
    mockRestServiceServer.verify();
  }

  @Test
  public void test_getPrimaries_returns_live_results_when_cache_fails() throws Exception {
    String json = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    String url =
        apiHost
            + "/academics/curriculums/v1/classes/search"
            + "?quarter=20222&subjectCode=MATH&objLevelCode=U&pageNumber=1&pageSize=100&includeClassSections=true";
    mockRestServiceServer
        .expect(requestTo(url))
        .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
    org.mockito.Mockito.when(courseCacheService.upsertSection(org.mockito.ArgumentMatchers.any()))
        .thenThrow(
            new org.springframework.dao.DataAccessResourceFailureException("Mongo unavailable"));

    assertEquals(CoursePage.fromJSON(json).getPrimaries(), ucs.getPrimaries("MATH", "20222", "U"));
    mockRestServiceServer.verify();
  }

  @Test
  public void test_index_failure_is_nonfatal_and_later_search_retries_preparation()
      throws Exception {
    String json = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    String url =
        apiHost
            + "/academics/curriculums/v1/classes/search"
            + "?quarter=20222&subjectCode=MATH&objLevelCode=U&pageNumber=1&pageSize=100&includeClassSections=true";
    mockRestServiceServer
        .expect(org.springframework.test.web.client.ExpectedCount.twice(), requestTo(url))
        .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
    org.mockito.Mockito.doThrow(
            new org.springframework.dao.DuplicateKeyException("existing duplicates"))
        .doNothing()
        .when(courseCacheService)
        .prepareIndex();
    List<Primary> expected = CoursePage.fromJSON(json).getPrimaries();

    assertEquals(expected, ucs.getPrimaries("MATH", "20222", "U"));
    org.mockito.Mockito.verify(courseCacheService).prepareIndex();
    org.mockito.Mockito.verify(courseCacheService, org.mockito.Mockito.never())
        .upsertSection(org.mockito.ArgumentMatchers.any());

    assertEquals(expected, ucs.getPrimaries("MATH", "20222", "U"));
    org.mockito.Mockito.verify(courseCacheService, org.mockito.Mockito.times(2)).prepareIndex();
    org.mockito.Mockito.verify(courseCacheService, org.mockito.Mockito.times(14))
        .upsertSection(org.mockito.ArgumentMatchers.any());
    mockRestServiceServer.verify();
  }

  @Test
  public void test_getPrimaries_empty_response_does_not_write_cache() throws Exception {
    String url =
        apiHost
            + "/academics/curriculums/v1/classes/search"
            + "?quarter=20222&subjectCode=MATH&pageNumber=1&pageSize=100&includeClassSections=true";
    mockRestServiceServer
        .expect(requestTo(url))
        .andRespond(
            withSuccess(
                "{\"pageNumber\":1,\"pageSize\":100,\"total\":0,\"classes\":[]}",
                MediaType.APPLICATION_JSON));
    assertEquals(List.of(), ucs.getPrimaries("MATH", "20222", "A"));
    org.mockito.Mockito.verifyNoInteractions(courseCacheService);
    mockRestServiceServer.verify();
  }

  @Test
  public void test_getPrimaries_upstream_failure_does_not_write_cache() {
    String url =
        apiHost
            + "/academics/curriculums/v1/classes/search"
            + "?quarter=20222&subjectCode=MATH&pageNumber=1&pageSize=100&includeClassSections=true";
    mockRestServiceServer
        .expect(requestTo(url))
        .andRespond(
            org.springframework.test.web.client.response.MockRestResponseCreators
                .withServerError());
    org.junit.jupiter.api.Assertions.assertThrows(
        org.springframework.web.client.HttpServerErrorException.class,
        () -> ucs.getPrimaries("MATH", "20222", "A"));
    org.mockito.Mockito.verifyNoInteractions(courseCacheService);
  }

  @Test
  public void test_getJSONByGE() throws Exception {
    String expectedResult = "{expectedResult}";

    String quarter = "2025";
    String area = "A1";

    String expectedParams =
        String.format("?quarter=%s&areas=%s&pageNumber=%d&pageSize=%d", quarter, area, 1, 500);
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedResult, MediaType.APPLICATION_JSON));

    String result = ucs.getJSONByGE(quarter, area);

    assertEquals(expectedResult, result);
  }

  @Test
  public void test_getPrimariesGE() throws Exception {
    ObjectMapper objectMapper = new ObjectMapper();

    // fixture classes don't technically match input GE area/quarter,
    // but that relies on underlying UCSB API, so no need to test in this controller
    String expectedCoursePageJSON = CoursePageFixtures.COURSE_PAGE_JSON;
    CoursePage expectedCoursePage =
        objectMapper.readValue(expectedCoursePageJSON, CoursePage.class);
    List<Primary> expectedConvertedPrimaries = expectedCoursePage.getPrimaries();

    String quarter = "20251";
    String area = "A1";

    String expectedParams =
        String.format("?quarter=%s&areas=%s&pageNumber=%d&pageSize=%d", quarter, area, 1, 500);
    String expectedURL =
        (UCSBCurriculumService.CURRICULUM_ENDPOINT + expectedParams).replace("{apiHost}", apiHost);

    this.mockRestServiceServer
        .expect(requestTo(expectedURL))
        .andExpect(header("Accept", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("Content-Type", MediaType.APPLICATION_JSON.toString()))
        .andExpect(header("ucsb-api-version", "1.0"))
        .andExpect(header("ucsb-api-key", apiKey))
        .andRespond(withSuccess(expectedCoursePageJSON, MediaType.APPLICATION_JSON));

    List<Primary> result = ucs.getPrimariesByGE(quarter, area);
    assertEquals(expectedConvertedPrimaries, result);
  }
}
