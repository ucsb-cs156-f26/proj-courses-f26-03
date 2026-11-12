# Missing MongoDB course data

The four course-history search pages (course, instructor, building/classroom,
and title/description) and both CSV download filters check availability when
submitted. Live UCSB API searches are unchanged.

The UI sends a CSRF-protected `POST /api/public/course-data/ensure` with
`startQtr`, `endQtr`, and optional `subjectArea` independently of the original
search or download. Existing search response bodies and CSV files are unchanged.
The availability response is a JSON array of user-facing warnings. A failed
availability request does not discard search results or promise that a load was
scheduled.

`CourseDataAvailabilityService` enumerates the requested quarters and subjects.
Without a subject filter, it uses the subject catalog, including inactive
subjects that may have historical courses. An unavailable catalog is an error,
not evidence of complete coverage. `CourseDataLoadService` reuses
`UpdateService.getLastUpdate`: any recorded load, even an old one or one with
zero courses, counts as available. Empty search results never trigger jobs by
themselves. Front-page cache writes do not create completeness records.

For each pair, a short READ_COMMITTED SQL transaction locks the existing subject
row with `FOR UPDATE`, checks MongoDB update metadata, checks the job table for
queued/running/cancelling jobs with the same name, and submits through the
existing `JobService` and `UpdateCourseDataJobFactory`. The background job loads
all levels for exactly that subject and quarter, using the existing freshness
checks and rate limit. Its name includes the pair. The library commits the
queued row before asynchronous dispatch returns, so the next lock holder can
see it, including on another application instance. Completed, failed, and
cancelled jobs allow another attempt if metadata is still missing. Dispatch
failures mark only the matching queued row failed and return a failure warning.
No new database tables or migrations are needed.

The duplicate guard covers these automatic requests. Existing administrative
and scheduled bulk update jobs retain their original behavior and may overlap;
the existing cache upserts handle concurrent writes. Broad historical searches
can enqueue many distinct subject/quarter jobs. Five minutes is an invitation
to recheck, not a completion guarantee.

## Manual verification

1. With a populated subject catalog, search a known unloaded subject/quarter.
   Confirm that the warning identifies both, says to check back in 5 minutes,
   and that the jobs page shows a load for precisely that pair.
2. Repeat from two browser sessions while the job is queued/running. Confirm
   that only one automatic job is created for the pair. For a search without
   a subject filter, check that only pairs missing update records are queued.
3. After successful completion, repeat the search. Confirm that results appear
   and the missing-data warning disappears. Search for a nonexistent course
   in this loaded pair and confirm that zero matches do not schedule a job.
4. Test a CSV download with the same filters. The download should retain its
   existing format while the page shows the availability warning.
5. Simulate an availability HTTP/network failure. Search results should still
   render, and the warning should say that checking/scheduling failed, without
   claiming that an update was scheduled.

Automated tests cover SQL concurrency, active/terminal job states, executor
rejection recovery, freshness-record detection, all five pages, warning reset,
and independent search/availability failures. Actual UCSB retrieval and
cross-instance PostgreSQL deployment behavior still warrant a staging check.
