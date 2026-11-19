package edu.ucsb.cs156.courses.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.mongodb.client.result.UpdateResult;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import edu.ucsb.cs156.courses.documents.CoursePage;
import edu.ucsb.cs156.courses.documents.CoursePageFixtures;
import org.bson.BsonObjectId;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

class CourseCacheServiceTests {
  MongoTemplate mongo = mock(MongoTemplate.class);
  IndexOperations indexes = mock(IndexOperations.class);
  CourseCacheService cache = new CourseCacheService(mongo);
  ConvertedSection section =
      CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B).convertedSections().get(0);

  @BeforeEach
  void setUp() {
    lenient().when(mongo.indexOps(ConvertedSection.class)).thenReturn(indexes);
  }

  @Test
  void countsInsertedAndMatchedIncludingUnchangedValues() {
    when(mongo.upsert(any(Query.class), any(Update.class), eq(ConvertedSection.class)))
        .thenReturn(
            UpdateResult.acknowledged(0, 0L, new BsonObjectId(new ObjectId())),
            UpdateResult.acknowledged(1, 0L, null));
    cache.prepareIndex();
    assertTrue(cache.upsertSection(section));
    assertFalse(cache.upsertSection(section));
    var index =
        org.mockito.ArgumentCaptor.forClass(
            org.springframework.data.mongodb.core.index.IndexDefinition.class);
    verify(indexes, times(1)).createIndex(index.capture());
    assertEquals(
        new org.bson.Document("courseInfo.quarter", 1).append("section.enrollCode", 1),
        index.getValue().getIndexKeys());
    assertEquals(true, index.getValue().getIndexOptions().get("unique"));
    assertEquals("quarter_enrollCode_unique", index.getValue().getIndexOptions().get("name"));
    var query = org.mockito.ArgumentCaptor.forClass(Query.class);
    var update = org.mockito.ArgumentCaptor.forClass(Update.class);
    verify(mongo, times(2)).upsert(query.capture(), update.capture(), eq(ConvertedSection.class));
    assertEquals(
        section.getCourseInfo().getQuarter(),
        query.getValue().getQueryObject().get("courseInfo.quarter"));
    assertEquals(
        section.getSection().getEnrollCode(),
        query.getValue().getQueryObject().get("section.enrollCode"));
    assertEquals(
        new org.bson.Document("courseInfo", section.getCourseInfo())
            .append("section", section.getSection()),
        update.getValue().getUpdateObject().get("$set"));
  }

  @Test
  void retriesConcurrentDuplicateAsUpdate() {
    when(mongo.upsert(any(Query.class), any(Update.class), eq(ConvertedSection.class)))
        .thenThrow(new DuplicateKeyException("concurrent insert"));
    when(mongo.updateFirst(any(Query.class), any(Update.class), eq(ConvertedSection.class)))
        .thenReturn(UpdateResult.acknowledged(1, 1L, null));
    assertFalse(cache.upsertSection(section));
  }

  @Test
  void propagatesDuplicateWhenRetryDoesNotMatch() {
    DuplicateKeyException failure = new DuplicateKeyException("unexpected duplicate");
    when(mongo.upsert(any(Query.class), any(Update.class), eq(ConvertedSection.class)))
        .thenThrow(failure);
    when(mongo.updateFirst(any(Query.class), any(Update.class), eq(ConvertedSection.class)))
        .thenReturn(UpdateResult.acknowledged(0, 0L, null));
    assertSame(
        failure, assertThrows(DuplicateKeyException.class, () -> cache.upsertSection(section)));
  }

  @Test
  void failedPreparationCanBeRetriedWithoutWritingCourses() {
    when(indexes.createIndex(any()))
        .thenThrow(new DuplicateKeyException("existing duplicate key"))
        .thenReturn("quarter_enrollCode_unique");
    assertThrows(DuplicateKeyException.class, () -> cache.prepareIndex());
    verify(mongo, never()).upsert(any(Query.class), any(Update.class), eq(ConvertedSection.class));
    when(mongo.upsert(any(Query.class), any(Update.class), eq(ConvertedSection.class)))
        .thenReturn(UpdateResult.acknowledged(1, 0L, null));
    cache.prepareIndex();
    assertFalse(cache.upsertSection(section));
    verify(indexes, times(2)).createIndex(any());
  }

  @Test
  void rejectsMissingLogicalKeysBeforeWriting() {
    section.getCourseInfo().setQuarter(null);
    assertThrows(IllegalArgumentException.class, () -> cache.upsertSection(section));
    section.getCourseInfo().setQuarter(" ");
    assertThrows(IllegalArgumentException.class, () -> cache.upsertSection(section));
    section.getCourseInfo().setQuarter("20222");
    section.getSection().setEnrollCode(null);
    assertThrows(IllegalArgumentException.class, () -> cache.upsertSection(section));
    section.getSection().setEnrollCode("");
    assertThrows(IllegalArgumentException.class, () -> cache.upsertSection(section));
    verifyNoInteractions(mongo);
  }
}
