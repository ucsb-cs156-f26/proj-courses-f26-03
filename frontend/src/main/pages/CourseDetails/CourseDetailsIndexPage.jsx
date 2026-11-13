import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import _BasicCourseTable from "main/components/Courses/BasicCourseTable";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useBackend } from "main/utils/useBackend";
import CourseDetailsTable from "main/components/CourseDetails/CourseDetailsTable";
import { yyyyqToQyy } from "main/utils/quarterUtilities";
import CourseDescriptionTable from "main/components/Courses/CourseDescriptionTable";
import GradeHistoryGraphs from "main/components/GradeHistory/GradeHistoryGraph";
import FinalExamCard from "main/components/Finals/FinalExamCard";
import EnrollmentHistoryBarGraph from "main/components/EnrollmentHistory/EnrollmentHistoryBarGraph";
import {
  getEnrollmentQuarters,
  getLectureInstructors,
  isSameCourse,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";
import SingleQuarterDropdown from "main/components/Quarters/SingleQuarterDropdown";
import { useSystemInfo } from "main/utils/systemInfo";

export default function CourseDetailsIndexPage() {
  // Stryker disable next-line all : Can't test state because hook is internal
  let { qtr, enrollCode } = useParams();
  const [enrollmentQuarter, setEnrollmentQuarter] = useState(qtr);
  const { data: systemInfo } = useSystemInfo();
  const {
    data: moreDetails,
    _error,
    _status,
  } = useBackend(
    // Stryker disable all : hard to test for query caching
    [`/api/sections/sectionsearch?qtr=${qtr}&enrollCode=${enrollCode}`],
    {
      method: "GET",
      url: `/api/sections/sectionsearch`,
      params: {
        qtr,
        enrollCode,
      },
    },
  );

  const {
    data: finalsInfo,
    _errorFinalsInfo,
    _statusFinalsInfo,
  } = useBackend(
    // Stryker disable all : hard to test for query caching
    [`/api/public/finalsInfo?quarterYYYYQ=${qtr}&enrollCd=${enrollCode}`],
    {
      method: "GET",
      url: `/api/public/finalsInfo`,
      params: {
        quarterYYYYQ: qtr,
        enrollCd: enrollCode,
      },
    },
  );
  const courseId = moreDetails?.courseId.trim() || "";

  let subjectArea = "";
  let trimmedCourseNumber = "";

  // Splitting on two spaces allows for courses with multiple word subject areas (i.e. AS AM) to be recognized
  if (courseId) {
    const splitArray = courseId.split("  ");
    subjectArea = splitArray[0];
    trimmedCourseNumber = splitArray[splitArray.length - 1].trim();
  }

  // Fetch Grade History Data
  const { data: gradeHistory } = useBackend(
    [
      `/api/gradehistory/search?subjectArea=${subjectArea}&courseNumber=${trimmedCourseNumber}`,
    ],
    {
      method: "GET",
      url: "/api/gradehistory/search",
      params: {
        subjectArea: subjectArea,
        courseNumber: trimmedCourseNumber,
      },
    },
  );
  // Fetch enrollment history for every section and quarter of this course
  const startQtr = systemInfo.startQtrYYYYQ;
  const endQtr = systemInfo.endQtrYYYYQ;
  const { data: enrollmentHistory } = useBackend(
    [
      `/api/enrollment/search?startQtr=${startQtr}&endQtr=${endQtr}&subjectArea=${subjectArea}&courseNumber=${trimmedCourseNumber}`,
    ],
    {
      method: "GET",
      url: "/api/enrollment/search",
      params: {
        startQtr,
        endQtr,
        subjectArea: subjectArea,
        courseNumber: trimmedCourseNumber,
      },
    },
    [],
    { enabled: Boolean(subjectArea && trimmedCourseNumber) },
  );
  const courseEnrollmentHistory = enrollmentHistory.filter((dataPoint) =>
    isSameCourse(dataPoint.courseId, courseId),
  );

  // Pass dates for the pass lines
  const { data: allQuarters } = useBackend(
    ["/api/public/allQuarters"],
    { method: "GET", url: "/api/public/allQuarters" },
    [],
  );
  const enrollmentPassDates =
    allQuarters.find((quarter) => quarter.quarter === enrollmentQuarter) || {};

  // Lectures in the selected quarter, for instructor names
  const { data: enrollmentPrimaries } = useBackend(
    // Stryker disable all : hard to test for query caching
    [
      `/api/public/courseovertime/search?startQtr=${enrollmentQuarter}&endQtr=${enrollmentQuarter}&subjectArea=${subjectArea}&courseNumber=${trimmedCourseNumber}`,
    ],
    {
      method: "GET",
      url: "/api/public/courseovertime/search",
      params: {
        startQtr: enrollmentQuarter,
        endQtr: enrollmentQuarter,
        subjectArea,
        courseNumber: trimmedCourseNumber,
      },
    },
    [],
    { enabled: Boolean(subjectArea && trimmedCourseNumber) },
    // Stryker restore all
  );

  // Quarters with data, plus the page's own quarter
  const enrollmentQuarterOptions = getEnrollmentQuarters([
    ...courseEnrollmentHistory,
    { yyyyq: qtr },
  ]).map((yyyyq) => ({ yyyyq, qyy: yyyyqToQyy(yyyyq) }));

  return (
    <BasicLayout>
      <div className="pt-2">
        {moreDetails && moreDetails.courseId && (
          <h5>
            Course Details for {moreDetails.courseId} {yyyyqToQyy(qtr)}
          </h5>
        )}
        <FinalExamCard
          finalsInfo={finalsInfo}
          cardProps={{ className: "py-1 my-4" }}
        />

        {moreDetails && <CourseDetailsTable details={[moreDetails]} />}
        {moreDetails && <CourseDescriptionTable course={moreDetails} />}
        {moreDetails && (
          <div data-testid="enrollment-history-section">
            <div style={{ maxWidth: "12rem" }}>
              <SingleQuarterDropdown
                quarter={enrollmentQuarter}
                quarters={enrollmentQuarterOptions}
                setQuarter={setEnrollmentQuarter}
                controlId="CourseDetails.EnrollmentQuarter"
                label="Enrollment History Quarter"
              />
            </div>
            <EnrollmentHistoryBarGraph
              data={courseEnrollmentHistory}
              yyyyq={enrollmentQuarter}
              passDates={enrollmentPassDates}
              instructors={getLectureInstructors(enrollmentPrimaries, courseId)}
              title={`Enrollment History – ${yyyyqToQyy(enrollmentQuarter)}`}
            />
          </div>
        )}
        {gradeHistory && <GradeHistoryGraphs gradeHistory={gradeHistory} />}
      </div>
    </BasicLayout>
  );
}
