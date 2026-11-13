package edu.ucsb.cs156.courses.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import edu.ucsb.cs156.courses.documents.CoursePage;
import edu.ucsb.cs156.courses.documents.CoursePageFixtures;
import edu.ucsb.cs156.courses.services.CourseCacheService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DataAccessException;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Real MongoDB checks, opt-in: COURSE_CACHE_TEST_MONGO_URI=mongodb://localhost:27017. */
@EnabledIfEnvironmentVariable(named = "COURSE_CACHE_TEST_MONGO_URI", matches = ".+")
class CourseCacheServiceIT {
  MongoClient client;
  MongoTemplate mongo;

  @BeforeEach
  void setUp() {
    client = MongoClients.create(System.getenv("COURSE_CACHE_TEST_MONGO_URI"));
    // Never use the URI's database or an application's existing collection.
    mongo =
        new MongoTemplate(
            client, "course_cache_test_" + UUID.randomUUID().toString().replace("-", ""));
  }

  @AfterEach
  void tearDown() {
    if (client != null) {
      try {
        mongo.getDb().drop();
      } finally {
        client.close();
      }
    }
  }

  ConvertedSection section() {
    return CoursePage.fromJSON(CoursePageFixtures.COURSE_PAGE_JSON_MATH3B)
        .convertedSections()
        .get(0);
  }

  @Test
  void concurrentWritersInsertExactlyOnceAndUpdatesPreserveId() throws Exception {
    int writers = 12;
    CountDownLatch ready = new CountDownLatch(writers);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<Integer>> results = new ArrayList<>();
    var executor = Executors.newFixedThreadPool(writers);
    try {
      for (int i = 0; i < writers; i++) {
        // Separate services exercise index creation and writes across independent instances.
        results.add(
            executor.submit(
                () -> {
                  CourseCacheService cache = new CourseCacheService(mongo);
                  ready.countDown();
                  assertTrue(start.await(10, TimeUnit.SECONDS));
                  cache.prepareIndex();
                  int inserted = 0;
                  for (int n = 0; n < 10; n++) {
                    if (cache.upsertSection(section())) inserted++;
                  }
                  return inserted;
                }));
      }
      assertTrue(ready.await(10, TimeUnit.SECONDS));
      start.countDown();
      int inserted = 0;
      for (Future<Integer> result : results) inserted += result.get(30, TimeUnit.SECONDS);
      assertEquals(1, inserted);
    } finally {
      start.countDown();
      executor.shutdownNow();
      assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
    }
    List<ConvertedSection> saved = mongo.findAll(ConvertedSection.class);
    assertEquals(1, saved.size());
    var id = saved.get(0).get_id();
    ConvertedSection changed = section();
    changed.getCourseInfo().setTitle("Updated title");
    changed.getSection().setEnrolledTotal(42);
    CourseCacheService cache = new CourseCacheService(mongo);
    cache.prepareIndex();
    assertFalse(cache.upsertSection(changed));
    ConvertedSection updated = mongo.findById(id, ConvertedSection.class);
    assertNotNull(updated);
    assertEquals("Updated title", updated.getCourseInfo().getTitle());
    assertEquals(42, updated.getSection().getEnrolledTotal());
    assertFalse(cache.upsertSection(changed)); // unchanged match still counts as updated
    changed.getCourseInfo().setQuarter("20994");
    assertTrue(cache.upsertSection(changed)); // enroll codes can recur in another quarter
    assertEquals(2, mongo.findAll(ConvertedSection.class).size());
  }

  @Test
  void existingDuplicatesBlockIndexAndLeaveAllDocumentsUntouched() {
    mongo.insert(section());
    mongo.insert(section());
    List<org.bson.Document> before = mongo.getCollection("courses").find().into(new ArrayList<>());
    DataAccessException failure =
        assertThrows(DataAccessException.class, () -> new CourseCacheService(mongo).prepareIndex());
    assertTrue(failure.getMessage().contains("duplicate key"));
    assertEquals(before, mongo.getCollection("courses").find().into(new ArrayList<>()));
  }
}
