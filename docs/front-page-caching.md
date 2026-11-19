# Front-page course caching

`UCSBCurriculumService.getPrimaries()` fetches UCSB once, builds the original
primary/secondary response, and caches the fetched page's converted sections via
`CourseCacheService.upsertSection()`. Cache exceptions are logged and the live
response still succeeds. The batch stops at its first cache failure; earlier
successful writes remain. No completion records or enrollment snapshots are
created by live searches. Raw basic search and GE search are not cached.

The shared service matches `courseInfo.quarter` and `section.enrollCode`, updates
course/section fields atomically, and preserves existing Mongo `_id` values.
An unchanged matched document counts as updated. Background jobs use the same
service and retain per-section error handling, cancellation checkpoints, update
counts, and registration-pass enrollment snapshots. A snapshot failure still
counts the successful course write and adds an error, as before.

## Unique index and existing data

Each nonempty search or subject/quarter background load calls `prepareIndex()`
once before any section writes, ensuring the unique compound index
`quarter_enrollCode_unique`. The service keeps no process-wide preparation state;
a later attempt retries even after an earlier failure. The application account needs index-creation rights.
If preparation fails, that attempt performs no course writes. Background loads
log one error per fetched section and retain cancellation checks while
accounting for skipped sections. They do not save an update record when index
preparation fails, leaving the freshness timestamp unchanged so a later
`ifStale` job can retry. Successful loads and partial section failures retain
the existing update-record behavior. Index creation is not repeated per section. Errors are
logged with MongoDB's conflicting key/details; the application does not delete,
merge, or repair records or replace existing indexes. Reattempts are allowed
once an operator resolves the issue. Existing duplicates must be reported and
reviewed before any data cleanup. The index also applies to historical records
with missing keys; incoming records must have nonblank quarter/enrollment code.

For a read-only preflight in the target database, an operator can run:

```javascript
db.courses.aggregate([
  { $group: {
      _id: { quarter: "$courseInfo.quarter", enrollCode: "$section.enrollCode" },
      count: { $sum: 1 }
  } },
  { $match: { count: { $gt: 1 } } }
])
```

No production database has been inspected or migrated as part of this change.
Index preparation occurs at the start of each nonempty batch, rather than at
deployment/startup.

## Verification

Run the relevant unit tests from the repository root:

```sh
mvn -Dtest=CourseCacheServiceTests,UCSBCurriculumServiceTests,UpdateCourseDataJobTests,UpdateCourseDataJobFactoryTests,JobsControllerTests,UCSBCurriculumControllerTests test
mvn test
mvn git-code-format:validate-code-format
git diff --check
```

If Mockito self-attachment is prohibited, supply its installed `mockito-core`
JAR through Surefire's `-DargLine=-javaagent:/absolute/path/to/mockito-core.jar`.
That argument overrides the normal JaCoCo agent; such a run proves unit behavior,
not coverage compliance.

Real MongoDB tests are separate and opt-in:

```sh
COURSE_CACHE_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=2000' \
  mvn -Dit.test=CourseCacheServiceIT test-compile failsafe:integration-test failsafe:verify
```

Use a disposable MongoDB instance. Tests create random `course_cache_test_*`
databases and drop only those databases afterward. They exercise 12 independent
service instances performing 120 competing writes, assert exactly one insert,
check stable IDs/updated values/quarter separation, and seed duplicates to check
that index failure leaves documents unchanged. Without the environment variable,
the tests are skipped. Mocked duplicate-key retry tests do not establish MongoDB
concurrency correctness.

## Limits

Caching is synchronous and can add MongoDB latency (including index building) to
a live search. Server selection timeouts do not bound index-build execution; a
slow build or write can delay the response even though cache exceptions are
nonfatal. This PR intentionally keeps synchronous caching. Cache failure can
leave only part of a page saved.
The UCSB request still retrieves only page 1 (100 course records), and searches
can be restricted to a course level. These writes never imply subject completeness.
Pagination, coverage tracking, automatic missing-data jobs, deduplication of jobs,
and removal of courses no longer returned upstream remain separate work.
