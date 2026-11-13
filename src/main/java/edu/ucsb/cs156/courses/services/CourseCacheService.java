package edu.ucsb.cs156.courses.services;

import com.mongodb.client.result.UpdateResult;
import edu.ucsb.cs156.courses.documents.ConvertedSection;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/** Shared section persistence. Does not record subject completeness or enrollment snapshots. */
@Service
public class CourseCacheService {
  private final MongoTemplate mongoTemplate;

  public CourseCacheService(MongoTemplate mongoTemplate) {
    this.mongoTemplate = mongoTemplate;
  }

  /**
   * Ensure uniqueness before any writes. Existing duplicates cause index creation to fail;
   * MongoDB's exception reports the conflicting key. Never repair or delete existing data here.
   */
  public void prepareIndex() {
    mongoTemplate
        .indexOps(ConvertedSection.class)
        .createIndex(
            new Index()
                .on("courseInfo.quarter", Direction.ASC)
                .on("section.enrollCode", Direction.ASC)
                .unique()
                .named("quarter_enrollCode_unique"));
  }

  /**
   * Call prepareIndex() once before writing a batch; abort the batch if preparation fails.
   *
   * @return true for an insert, false for an existing section (even if values are unchanged).
   */
  public boolean upsertSection(ConvertedSection section) {
    String quarter = section.getCourseInfo().getQuarter();
    String enrollCode = section.getSection().getEnrollCode();
    if (quarter == null || quarter.isBlank() || enrollCode == null || enrollCode.isBlank()) {
      throw new IllegalArgumentException("Quarter and enrollment code are required for caching");
    }
    Query query =
        Query.query(
            Criteria.where("courseInfo.quarter")
                .is(quarter)
                .and("section.enrollCode")
                .is(enrollCode));
    Update update =
        new Update()
            .set("courseInfo", section.getCourseInfo())
            .set("section", section.getSection());
    try {
      UpdateResult result = mongoTemplate.upsert(query, update, ConvertedSection.class);
      return result.getUpsertedId() != null;
    } catch (DuplicateKeyException concurrentInsert) {
      // Another writer may insert between matching and inserting. Retry only as an update;
      // preserve its _id and propagate an unexpected duplicate-key failure.
      UpdateResult result = mongoTemplate.updateFirst(query, update, ConvertedSection.class);
      if (result.getMatchedCount() == 0) {
        throw concurrentInsert;
      }
      return false;
    }
  }
}
