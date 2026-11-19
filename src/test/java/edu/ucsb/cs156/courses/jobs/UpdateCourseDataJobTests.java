package edu.ucsb.cs156.courses.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import edu.ucsb.cs156.courses.collections.UpdateCollection;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import edu.ucsb.cs156.courses.documents.CoursePage;
import edu.ucsb.cs156.courses.documents.CoursePageFixtures;
import edu.ucsb.cs156.courses.documents.Update;
import edu.ucsb.cs156.courses.entities.EnrollmentDataPoint;
import edu.ucsb.cs156.courses.repositories.EnrollmentDataPointRepository;
import edu.ucsb.cs156.courses.services.CourseCacheService;
import edu.ucsb.cs156.courses.services.IsStaleService;
import edu.ucsb.cs156.courses.services.UCSBAPIQuarterService;
import edu.ucsb.cs156.courses.services.UCSBCurriculumService;
import edu.ucsb.cs156.courses.services.UpdateService;
import edu.ucsb.cs156.jobs.entities.Job;
import edu.ucsb.cs156.jobs.errors.JobCancelledException;
import edu.ucsb.cs156.jobs.repositories.JobsRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobRateLimit;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@EnableConfigurationProperties(value = JobRateLimit.class)
@TestPropertySource("classpath:application.properties")
public class UpdateCourseDataJobTests {
  @Mock UCSBCurriculumService ucsbCurriculumService;

  @Mock CourseCacheService courseCacheService;

  @Mock UpdateCollection updateCollection;

  @Mock IsStaleService isStaleService;

  @Mock EnrollmentDataPointRepository enrollmentDataPointRepository;

  @Mock UCSBAPIQuarterService ucsbapiQuarterService;

  @Mock JobRateLimit jobRateLimit;

  Job jobStarted = Job.builder().build();
  JobContext ctx = new JobContext(null, jobStarted);

  @Test
  void test_subject_and_quarter_range() throws Exception {
    var job =
        spy(
            UpdateCourseDataJob.builder()
                .start_quarterYYYYQ("20211")
                .end_quarterYYYYQ("20213")
                .subjects(List.of("CMPSC", "MATH"))
                .ucsbCurriculumService(ucsbCurriculumService)
                .courseCacheService(courseCacheService)
                .updateCollection(updateCollection)
                .isStaleService(isStaleService)
                .ifStale(false)
                .enrollmentDataPointRepository(enrollmentDataPointRepository)
                .ucsbapiQuarterService(ucsbapiQuarterService)
                .jobRateLimit(jobRateLimit)
                .build());
    doNothing().when(job).updateCourses(any(), any(), any());

    job.accept(ctx);

    verify(job).updateCourses(ctx, "20211", "CMPSC");
    verify(job).updateCourses(ctx, "20212", "CMPSC");
    verify(job).updateCourses(ctx, "20213", "CMPSC");

    verify(job).updateCourses(ctx, "20211", "MATH");
    verify(job).updateCourses(ctx, "20212", "MATH");
    verify(job).updateCourses(ctx, "20213", "MATH");
    verify(jobRateLimit, atLeastOnce()).sleep();
  }

  @Test
  void test_log_output_success() throws Exception {

    // Arrange

    String coursePageJson = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage coursePage = CoursePage.fromJSON(coursePageJson);

    List<ConvertedSection> result = coursePage.convertedSections();

    when(ucsbCurriculumService.getConvertedSections(eq("CMPSC"), eq("20211"), eq("A")))
        .thenReturn(result);

    when(ucsbapiQuarterService.isQuarterInRegistrationPass(anyString())).thenReturn(false);

    LocalDateTime someTime = LocalDateTime.parse("2022-03-05T15:50:10");
    Update update = new Update(null, "CMPSC", "20211", 14, 0, 0, someTime);
    when(updateCollection.save(any())).thenReturn(update);

    when(courseCacheService.upsertSection(any())).thenReturn(true);

    // Act
    var job =
        new UpdateCourseDataJob(
            "20211",
            "20211",
            List.of("CMPSC"),
            ucsbCurriculumService,
            courseCacheService,
            updateCollection,
            isStaleService,
            false,
            enrollmentDataPointRepository,
            ucsbapiQuarterService,
            jobRateLimit);
    job.accept(ctx);

    // Assert

    String expected =
        """
                Updating courses from 20211 to 20211 for 1 subjects
                Updating courses for [CMPSC 20211]
                14 new sections saved, 0 sections updated, 0 errors, last update: 2022-03-05T15:50:10
                Saved update: Update(_id=null, subjectArea=CMPSC, quarter=20211, saved=14, updated=0, errors=0, lastUpdate=2022-03-05T15:50:10)
                Finished updating courses""";

    assertEquals(expected, jobStarted.getLog());
    verifyNoInteractions(enrollmentDataPointRepository);
    verify(courseCacheService).prepareIndex();
  }

  @Test
  void test_log_output_with_updates() throws Exception {

    // Arrange

    String coursePageJson = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage coursePage = CoursePage.fromJSON(coursePageJson);

    List<ConvertedSection> convertedSections = coursePage.convertedSections();

    List<ConvertedSection> listWithTwoOrigOneDuplicate = new ArrayList<>();

    ConvertedSection section0 = convertedSections.get(0);
    ConvertedSection section1 = convertedSections.get(1);

    listWithTwoOrigOneDuplicate.add(section0);
    listWithTwoOrigOneDuplicate.add(section1);
    listWithTwoOrigOneDuplicate.add(section0);

    when(ucsbCurriculumService.getConvertedSections(eq("MATH"), eq("20211"), eq("A")))
        .thenReturn(listWithTwoOrigOneDuplicate);
    when(courseCacheService.upsertSection(section0)).thenReturn(true, false);
    when(courseCacheService.upsertSection(section1)).thenReturn(true);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass(anyString())).thenReturn(false);

    LocalDateTime someTime = LocalDateTime.parse("2022-03-05T15:50:10");
    Update update = new Update(null, "MATH", "20211", 2, 1, 0, someTime);
    when(updateCollection.save(any())).thenReturn(update);

    // Act
    var job =
        new UpdateCourseDataJob(
            "20211",
            "20211",
            List.of("MATH"),
            ucsbCurriculumService,
            courseCacheService,
            updateCollection,
            isStaleService,
            false,
            enrollmentDataPointRepository,
            ucsbapiQuarterService,
            jobRateLimit);
    job.accept(ctx);

    // Assert

    String expected =
        """
                Updating courses from 20211 to 20211 for 1 subjects
                Updating courses for [MATH 20211]
                2 new sections saved, 1 sections updated, 0 errors, last update: 2022-03-05T15:50:10
                Saved update: Update(_id=null, subjectArea=MATH, quarter=20211, saved=2, updated=1, errors=0, lastUpdate=2022-03-05T15:50:10)
                Finished updating courses""";

    assertEquals(expected, jobStarted.getLog());
  }

  @Test
  void test_log_output_with_errors() throws Exception {

    // Arrange

    String coursePageJson = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage coursePage = CoursePage.fromJSON(coursePageJson);

    List<ConvertedSection> convertedSections = coursePage.convertedSections();

    List<ConvertedSection> listWithOneSection = new ArrayList<>();

    ConvertedSection section0 = convertedSections.get(0);

    listWithOneSection.add(section0);

    when(ucsbCurriculumService.getConvertedSections(eq("MATH"), eq("20211"), eq("A")))
        .thenReturn(listWithOneSection);
    when(courseCacheService.upsertSection(section0))
        .thenThrow(new IllegalArgumentException("Testing Exception Handling!"));
    when(ucsbapiQuarterService.isQuarterInRegistrationPass(anyString())).thenReturn(false);

    LocalDateTime someTime = LocalDateTime.parse("2022-03-05T15:50:10");
    Update update = new Update(null, "MATH", "20211", 0, 0, 1, someTime);
    when(updateCollection.save(any())).thenReturn(update);

    // Act
    var job =
        new UpdateCourseDataJob(
            "20211",
            "20211",
            List.of("MATH"),
            ucsbCurriculumService,
            courseCacheService,
            updateCollection,
            isStaleService,
            false,
            enrollmentDataPointRepository,
            ucsbapiQuarterService,
            jobRateLimit);
    job.accept(ctx);

    // Assert

    String expected =
        """
                Updating courses from 20211 to 20211 for 1 subjects
                Updating courses for [MATH 20211]
                0 new sections saved, 0 sections updated, 1 errors, last update: 2022-03-05T15:50:10
                Saved update: Update(_id=null, subjectArea=MATH, quarter=20211, saved=0, updated=0, errors=1, lastUpdate=2022-03-05T15:50:10)
                Finished updating courses""";

    assertEquals(expected, jobStarted.getLog());
  }

  @Test
  void test_updating_to_new_values() throws Exception {

    // Arrange

    String coursePageJson = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage coursePage = CoursePage.fromJSON(coursePageJson);

    List<ConvertedSection> convertedSections = coursePage.convertedSections();

    List<ConvertedSection> listWithUpdatedSection = new ArrayList<>();

    ConvertedSection section0 = convertedSections.get(0);

    int oldEnrollment = section0.getSection().getEnrolledTotal();

    ConvertedSection updatedSection = (ConvertedSection) section0.clone();
    updatedSection.getCourseInfo().setTitle("New Title");
    updatedSection.getSection().setEnrolledTotal(oldEnrollment + 1);
    listWithUpdatedSection.add(updatedSection);

    when(ucsbCurriculumService.getConvertedSections(eq("MATH"), eq("20211"), eq("A")))
        .thenReturn(listWithUpdatedSection);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass(anyString())).thenReturn(false);

    LocalDateTime someTime = LocalDateTime.parse("2022-03-05T15:50:10");
    Update update = new Update(null, "MATH", "20211", 0, 1, 1, someTime);
    when(updateCollection.save(any())).thenReturn(update);

    // Act
    var job =
        new UpdateCourseDataJob(
            "20211",
            "20211",
            List.of("MATH"),
            ucsbCurriculumService,
            courseCacheService,
            updateCollection,
            isStaleService,
            false,
            enrollmentDataPointRepository,
            ucsbapiQuarterService,
            jobRateLimit);
    job.accept(ctx);

    // Assert

    String expected =
        """
                Updating courses from 20211 to 20211 for 1 subjects
                Updating courses for [MATH 20211]
                0 new sections saved, 1 sections updated, 0 errors, last update: 2022-03-05T15:50:10
                Saved update: Update(_id=null, subjectArea=MATH, quarter=20211, saved=0, updated=1, errors=1, lastUpdate=2022-03-05T15:50:10)
                Finished updating courses""";

    assertEquals(expected, jobStarted.getLog());

    verify(courseCacheService).upsertSection(updatedSection);
  }

  @Test
  void test_if_stale_and_is_stale() throws Exception {

    // Arrange

    when(isStaleService.isStale(eq("MATH"), eq("20211"))).thenReturn(true);

    String coursePageJson = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage coursePage = CoursePage.fromJSON(coursePageJson);

    List<ConvertedSection> convertedSections = coursePage.convertedSections();

    List<ConvertedSection> listWithUpdatedSection = new ArrayList<>();

    ConvertedSection section0 = convertedSections.get(0);

    int oldEnrollment = section0.getSection().getEnrolledTotal();

    ConvertedSection updatedSection = (ConvertedSection) section0.clone();
    updatedSection.getCourseInfo().setTitle("New Title");
    updatedSection.getSection().setEnrolledTotal(oldEnrollment + 1);
    listWithUpdatedSection.add(updatedSection);

    when(ucsbCurriculumService.getConvertedSections(eq("MATH"), eq("20211"), eq("A")))
        .thenReturn(listWithUpdatedSection);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass(eq("20211"))).thenReturn(true);

    LocalDateTime someTime = LocalDateTime.parse("2022-03-05T15:50:10");
    Update update = new Update(null, "MATH", "20211", 0, 1, 1, someTime);
    when(updateCollection.save(any())).thenReturn(update);

    EnrollmentDataPoint edp = updatedSection.getEnrollmentDataPoint();
    when(enrollmentDataPointRepository.save(eq(edp))).thenReturn(edp);

    // Act
    var job =
        new UpdateCourseDataJob(
            "20211",
            "20211",
            List.of("MATH"),
            ucsbCurriculumService,
            courseCacheService,
            updateCollection,
            isStaleService,
            true,
            enrollmentDataPointRepository,
            ucsbapiQuarterService,
            jobRateLimit);
    job.accept(ctx);

    // Assert

    String expected =
        """
                Updating courses from 20211 to 20211 for 1 subjects
                Updating courses for [MATH 20211]
                0 new sections saved, 1 sections updated, 0 errors, last update: 2022-03-05T15:50:10
                Saved update: Update(_id=null, subjectArea=MATH, quarter=20211, saved=0, updated=1, errors=1, lastUpdate=2022-03-05T15:50:10)
                Finished updating courses""";

    assertEquals(expected, jobStarted.getLog());

    verify(courseCacheService).upsertSection(updatedSection);
    verify(enrollmentDataPointRepository, times(1)).save(eq(edp));
  }

  @Test
  void test_if_stale_and_is_not_stale() throws Exception {

    // Arrange

    when(isStaleService.isStale(eq("MATH"), eq("20211"))).thenReturn(false);

    // Act
    var job =
        new UpdateCourseDataJob(
            "20211",
            "20211",
            List.of("MATH"),
            ucsbCurriculumService,
            courseCacheService,
            updateCollection,
            isStaleService,
            true,
            enrollmentDataPointRepository,
            ucsbapiQuarterService,
            jobRateLimit);
    job.accept(ctx);
  }

  @Test
  void snapshotFailureCountsPersistedSectionAndErrorThenContinues() throws Exception {
    List<ConvertedSection> sections =
        CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B)
            .convertedSections()
            .subList(0, 2);
    when(ucsbCurriculumService.getConvertedSections("MATH", "20222", "A")).thenReturn(sections);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass("20222")).thenReturn(true);
    when(courseCacheService.upsertSection(sections.get(0))).thenReturn(true);
    when(courseCacheService.upsertSection(sections.get(1))).thenReturn(false);
    when(enrollmentDataPointRepository.save(sections.get(0).getEnrollmentDataPoint()))
        .thenThrow(new IllegalStateException("snapshot failure"));
    when(updateCollection.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var job =
        UpdateCourseDataJob.builder()
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .build();

    job.updateCourses(ctx, "20222", "MATH");

    var update = org.mockito.ArgumentCaptor.forClass(Update.class);
    verify(updateCollection).save(update.capture());
    assertEquals(1, update.getValue().getSaved());
    assertEquals(1, update.getValue().getUpdated());
    assertEquals(1, update.getValue().getErrors());
    verify(enrollmentDataPointRepository).save(sections.get(1).getEnrollmentDataPoint());
  }

  @Test
  void persistenceFailureSkipsSnapshotButContinuesToNextSection() throws Exception {
    List<ConvertedSection> sections =
        CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B)
            .convertedSections()
            .subList(0, 2);
    when(ucsbCurriculumService.getConvertedSections("MATH", "20222", "A")).thenReturn(sections);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass("20222")).thenReturn(true);
    when(courseCacheService.upsertSection(sections.get(0)))
        .thenThrow(new IllegalStateException("cache failure"));
    when(courseCacheService.upsertSection(sections.get(1))).thenReturn(true);
    when(updateCollection.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var job =
        UpdateCourseDataJob.builder()
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .build();

    job.updateCourses(ctx, "20222", "MATH");

    var update = org.mockito.ArgumentCaptor.forClass(Update.class);
    verify(updateCollection).save(update.capture());
    assertEquals(1, update.getValue().getSaved());
    assertEquals(0, update.getValue().getUpdated());
    assertEquals(1, update.getValue().getErrors());
    verify(enrollmentDataPointRepository, never()).save(sections.get(0).getEnrollmentDataPoint());
    verify(enrollmentDataPointRepository).save(sections.get(1).getEnrollmentDataPoint());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  void indexFailurePreservesFreshnessAndNextIfStaleAttemptRetries(boolean previouslyLoaded)
      throws Exception {
    List<ConvertedSection> sections =
        CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B)
            .convertedSections()
            .subList(0, 2);
    when(ucsbCurriculumService.getConvertedSections("MATH", "20222", "A")).thenReturn(sections);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass("20222")).thenReturn(true);
    doThrow(new IllegalStateException("duplicate index keys"))
        .doNothing()
        .when(courseCacheService)
        .prepareIndex();
    // Use the real freshness services so an accidental failure timestamp would skip retrying.
    var lastUpdate =
        new AtomicReference<Update>(
            previouslyLoaded
                ? new Update(null, "MATH", "20222", 2, 0, 0, LocalDateTime.now().minusDays(2))
                : null);
    Update originalUpdate = lastUpdate.get();
    when(updateCollection.findBySubjectAreaAndQuarter(eq("MATH"), eq("20222"), any()))
        .thenAnswer(
            invocation ->
                new PageImpl<>(lastUpdate.get() == null ? List.of() : List.of(lastUpdate.get())));
    when(updateCollection.save(any()))
        .thenAnswer(
            invocation -> {
              Update saved = invocation.getArgument(0);
              saved.setLastUpdate(LocalDateTime.now());
              lastUpdate.set(saved);
              return saved;
            });
    var updateService = new UpdateService();
    ReflectionTestUtils.setField(updateService, "updateCollection", updateCollection);
    var freshnessService = new IsStaleService();
    ReflectionTestUtils.setField(freshnessService, "updateService", updateService);
    ReflectionTestUtils.setField(freshnessService, "ucsbApiQuarterService", ucsbapiQuarterService);
    ReflectionTestUtils.setField(freshnessService, "courseDataStaleThresholdMinutes", 1440);
    when(ucsbapiQuarterService.getCurrentQuarterYYYYQ()).thenReturn("20222");
    var job =
        UpdateCourseDataJob.builder()
            .start_quarterYYYYQ("20222")
            .end_quarterYYYYQ("20222")
            .subjects(List.of("MATH"))
            .ifStale(true)
            .isStaleService(freshnessService)
            .jobRateLimit(jobRateLimit)
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .build();

    job.accept(ctx);
    verify(courseCacheService).prepareIndex();
    verify(courseCacheService, never()).upsertSection(any());
    verifyNoInteractions(enrollmentDataPointRepository);
    verify(updateCollection, never()).save(any());
    assertEquals(originalUpdate, lastUpdate.get());
    assertTrue(freshnessService.isStale("MATH", "20222"));
    assertTrue(
        jobStarted
            .getLog()
            .lines()
            .anyMatch(
                line ->
                    line.equals(
                        "Skipped update for [MATH 20222]: course index preparation failed; "
                            + "2 errors; freshness timestamp unchanged")));

    when(courseCacheService.upsertSection(any())).thenReturn(true);
    job.accept(ctx);

    verify(courseCacheService, times(2)).prepareIndex();
    verify(courseCacheService).upsertSection(sections.get(0));
    verify(courseCacheService).upsertSection(sections.get(1));
    verify(enrollmentDataPointRepository).save(sections.get(0).getEnrollmentDataPoint());
    verify(enrollmentDataPointRepository).save(sections.get(1).getEnrollmentDataPoint());
    var updates = org.mockito.ArgumentCaptor.forClass(Update.class);
    verify(updateCollection).save(updates.capture());
    assertEquals(2, updates.getValue().getSaved());
    assertEquals(0, updates.getValue().getErrors());
    assertFalse(freshnessService.isStale("MATH", "20222"));

    // A successful retry restores normal ifStale behavior: the next run skips the API load.
    job.accept(ctx);
    verify(ucsbCurriculumService, times(2)).getConvertedSections("MATH", "20222", "A");
    verify(courseCacheService, times(2)).prepareIndex();
    verify(updateCollection).save(any());
  }

  @Test
  void cancellationStillInterruptsSectionAccountingAfterIndexFailure() throws Exception {
    List<ConvertedSection> sections =
        CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B)
            .convertedSections()
            .subList(0, 2);
    when(ucsbCurriculumService.getConvertedSections("MATH", "20222", "A")).thenReturn(sections);
    doThrow(new IllegalStateException("index failure")).when(courseCacheService).prepareIndex();
    JobContext cancellingCtx = mock(JobContext.class);
    doNothing()
        .doNothing()
        .doThrow(new JobCancelledException(99L))
        .when(cancellingCtx)
        .checkCancellation();
    var job =
        UpdateCourseDataJob.builder()
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .build();

    assertThrows(
        JobCancelledException.class, () -> job.updateCourses(cancellingCtx, "20222", "MATH"));
    verify(cancellingCtx, times(3)).checkCancellation();
    verify(courseCacheService).prepareIndex();
    verify(courseCacheService, never()).upsertSection(any());
    verifyNoInteractions(enrollmentDataPointRepository, updateCollection);
  }

  @Test
  void cancellationAfterPreparationStopsBeforeSectionWrites() throws Exception {
    when(ucsbCurriculumService.getConvertedSections("MATH", "20222", "A"))
        .thenReturn(
            CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B).convertedSections());
    JobContext cancellingCtx = mock(JobContext.class);
    doNothing().doThrow(new JobCancelledException(99L)).when(cancellingCtx).checkCancellation();
    var job =
        UpdateCourseDataJob.builder()
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .build();
    assertThrows(
        JobCancelledException.class, () -> job.updateCourses(cancellingCtx, "20222", "MATH"));
    verify(courseCacheService).prepareIndex();
    verify(courseCacheService, never()).upsertSection(any());
    verifyNoInteractions(enrollmentDataPointRepository, updateCollection);
  }

  @Test
  void emptyLoadDoesNotPrepareIndexOrRecordErrors() throws Exception {
    when(ucsbCurriculumService.getConvertedSections("MATH", "20222", "A")).thenReturn(List.of());
    when(updateCollection.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var job =
        UpdateCourseDataJob.builder()
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .build();
    job.updateCourses(ctx, "20222", "MATH");
    verifyNoInteractions(courseCacheService, enrollmentDataPointRepository);
    var update = org.mockito.ArgumentCaptor.forClass(Update.class);
    verify(updateCollection).save(update.capture());
    assertEquals(0, update.getValue().getErrors());
  }

  // ────────────────────── checkCancellation checkpoints ──────────────────────
  // On a typical re-run, most (subjectArea, quarterYYYYQ) pairs are not stale and hit `continue`
  // with no ctx.log() call at all, and the convertedSections loop never calls ctx.log() at any
  // point (only after the whole loop finishes). Without their own ctx.checkCancellation()
  // checkpoints, cancellation could sit unactioned through both loops no matter how many pairs
  // or sections they process. These tests mock a JobsRepository that reports "running" for
  // exactly the calls known to precede the checkpoint under test, then "cancelling" from then on,
  // and assert both that JobCancelledException is thrown AND that a specific downstream call the
  // checkpoint should have pre-empted was never made -- the second assertion is what actually
  // distinguishes the real code from a mutant that removes the checkpoint, since removing one
  // checkpoint just shifts the exception to whatever checkpoint comes next.

  private static Job runningJob() {
    return Job.builder().id(99L).status("running").build();
  }

  private static Job cancellingJob() {
    return Job.builder().id(99L).status("cancelling").build();
  }

  @Test
  void checkCancellation_stops_the_subject_loop_before_checking_staleness() throws Exception {
    JobsRepository jobsRepository = mock(JobsRepository.class);
    // 1 real checkpoint precedes the outer loop's own check: accept()'s opening "Updating
    // courses..." log line.
    when(jobsRepository.findById(99L))
        .thenReturn(Optional.of(runningJob()), Optional.of(cancellingJob()));
    Job job = Job.builder().id(99L).build();
    JobContext cancellingCtx = new JobContext(null, job, null, jobsRepository);

    var updateCourseDataJob =
        UpdateCourseDataJob.builder()
            .start_quarterYYYYQ("20211")
            .end_quarterYYYYQ("20211")
            .subjects(List.of("CMPSC"))
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .isStaleService(isStaleService)
            .ifStale(false)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .jobRateLimit(jobRateLimit)
            .build();

    assertThrows(JobCancelledException.class, () -> updateCourseDataJob.accept(cancellingCtx));

    verify(isStaleService, never()).isStale(any(), any());
    verify(ucsbCurriculumService, never()).getConvertedSections(any(), any(), any());
  }

  @Test
  void checkCancellation_stops_before_index_preparation() throws Exception {
    String coursePageJson = CoursePageFixtures.COURSE_PAGE_JSON_MATH3B;
    CoursePage coursePage = CoursePage.fromJSON(coursePageJson);
    List<ConvertedSection> result = coursePage.convertedSections();
    when(ucsbCurriculumService.getConvertedSections(eq("CMPSC"), eq("20211"), eq("A")))
        .thenReturn(result);
    when(ucsbapiQuarterService.isQuarterInRegistrationPass(anyString())).thenReturn(false);

    JobsRepository jobsRepository = mock(JobsRepository.class);
    // Three checkpoints precede index preparation's cancellation check: accept()'s opening
    // log line, the outer subject-loop check, and updateCourses' opening log line.
    when(jobsRepository.findById(99L))
        .thenReturn(
            Optional.of(runningJob()),
            Optional.of(runningJob()),
            Optional.of(runningJob()),
            Optional.of(cancellingJob()));
    Job job = Job.builder().id(99L).build();
    JobContext cancellingCtx = new JobContext(null, job, null, jobsRepository);

    var updateCourseDataJob =
        UpdateCourseDataJob.builder()
            .start_quarterYYYYQ("20211")
            .end_quarterYYYYQ("20211")
            .subjects(List.of("CMPSC"))
            .ucsbCurriculumService(ucsbCurriculumService)
            .courseCacheService(courseCacheService)
            .updateCollection(updateCollection)
            .isStaleService(isStaleService)
            .ifStale(false)
            .enrollmentDataPointRepository(enrollmentDataPointRepository)
            .ucsbapiQuarterService(ucsbapiQuarterService)
            .jobRateLimit(jobRateLimit)
            .build();

    assertThrows(JobCancelledException.class, () -> updateCourseDataJob.accept(cancellingCtx));

    verifyNoInteractions(courseCacheService);
  }
}
