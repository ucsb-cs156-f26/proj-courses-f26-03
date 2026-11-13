import { useBackend } from "main/utils/useBackend";
import EnrollmentHistoryGraph from "main/components/EnrollmentHistory/EnrollmentHistoryGraph";
import { stripLectureSuffix } from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

const selectedEnrollmentLineColors = ["#0d6efd"];

export default function EnrollmentHistoryDisplay({ selection }) {
  const { quarter, enrollCode } = selection;
  const courseId = stripLectureSuffix(selection.courseId);

  // Splitting on two spaces allows for courses with multiple word subject areas (i.e. AS AM) to be recognized
  const splitArray = courseId.split("  ");
  const subjectArea = splitArray[0];
  const courseNumber = splitArray[splitArray.length - 1].trim();

  // Stryker disable all : hard to test for query caching
  const {
    data: enrollmentHistory,
    isLoading,
    isError,
  } = useBackend(
    [
      `/api/enrollment/search?startQtr=${quarter}&endQtr=${quarter}&subjectArea=${subjectArea}&courseNumber=${courseNumber}&enrollCd=${enrollCode}`,
    ],
    {
      method: "GET",
      url: "/api/enrollment/search",
      params: {
        startQtr: quarter,
        endQtr: quarter,
        subjectArea,
        courseNumber,
        enrollCd: enrollCode,
      },
    },
    undefined,
    { enabled: Boolean(subjectArea && courseNumber && enrollCode) },
  );
  // Stryker restore all

  if (isLoading) {
    return (
      <div
        className="text-center mt-3"
        data-testid="enrollment-history-loading"
      >
        Loading enrollment history...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="text-center mt-3 text-danger"
        data-testid="enrollment-history-error"
      >
        Unable to load enrollment history.
      </div>
    );
  }

  // Stryker disable next-line ArrayDeclaration : an unmatched placeholder filters out the same as []
  const selectedEnrollmentHistory = (enrollmentHistory || []).filter(
    (dataPoint) => dataPoint.enrollCd === enrollCode,
  );

  if (selectedEnrollmentHistory.length === 0) {
    return (
      <div className="text-center mt-3" data-testid="enrollment-history-empty">
        No enrollment history data is available for this section.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <EnrollmentHistoryGraph
        data={selectedEnrollmentHistory}
        lineColors={selectedEnrollmentLineColors}
        title={`Enrollment History for ${courseId.trim()} (${enrollCode})`}
      />
    </div>
  );
}
