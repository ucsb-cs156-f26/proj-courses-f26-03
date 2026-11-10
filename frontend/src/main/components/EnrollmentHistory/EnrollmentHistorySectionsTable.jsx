import SectionsTableBase from "main/components/SectionsTableBase";
import { Button } from "react-bootstrap";

import {
  formatDays,
  formatInstructors,
  formatLocation,
  formatTime,
  formatStatus,
  formatSession,
  enrollmentFraction,
  getSection,
  getSectionField,
  renderInfoLink,
  renderDetailPageLink,
  getQuarter,
} from "main/utils/sectionUtils.jsx";
import { yyyyqToQyy } from "main/utils/quarterUtilities";

export default function EnrollmentHistorySectionsTable({
  sections,
  showSession = false,
  onShowEnrollmentHistory = () => {},
}) {
  const testid = "EnrollmentHistorySectionsTable";

  const columns = [
    {
      id: "expander", // Unique ID for the expander column
      header: ({ table }) => (
        <button
          data-testid={`${testid}-expand-all-rows`}
          {...{
            onClick: table.getToggleAllRowsExpandedHandler(),
          }}
        >
          {table.getIsAllRowsExpanded() ? "➖" : "➕"}
        </button>
      ),
      cell: ({ row }) =>
        row.getCanExpand() ? (
          <button
            data-testid={`${testid}-row-${row.index}-expand-button`}
            {...{
              onClick: row.getToggleExpandedHandler(),
              style: { cursor: "pointer" },
            }}
          >
            {row.getIsExpanded() ? "➖" : "➕"}
          </button>
        ) : (
          <span data-testid={`${testid}-row-${row.index}-cannot-expand`} />
        ),
      // This is important for indenting sub-rows
      // We'll apply this style in the render, but you can define it here too
      // For sub-rows, you might want to adjust cell content for clarity
    },
    {
      header: "Quarter",
      accessorKey: "quarter",
      cell: ({ row }) =>
        row.original.quarter ? yyyyqToQyy(row.original.quarter) : "",
    },
    {
      accessorKey: "courseId",
      header: "Course ID",
      cell: ({ row }) => {
        return renderDetailPageLink(row, testid);
      },
    },
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => formatStatus(getSection(row)),
    },
    {
      header: "Enrolled",
      accessorKey: "enrolled",
      cell: ({ row }) => enrollmentFraction(row),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => formatLocation(getSection(row).timeLocations),
    },
    {
      id: "days",
      header: "Days",
      cell: ({ row }) => formatDays(getSection(row).timeLocations),
    },
    {
      id: "time",
      header: "Time",
      cell: ({ row }) => formatTime(getSection(row).timeLocations),
    },
    {
      id: "instructor",
      header: "Instructor",
      cell: ({ row }) => formatInstructors(getSection(row).instructors),
    },
    {
      accessorKey: "enrollCode",
      header: "Enroll Code",
      cell: ({ row }) => getSectionField(row, "enrollCode"),
    },
    ...(showSession
      ? [
          {
            id: "session",
            header: "Session",
            cell: ({ row }) =>
              formatSession(getQuarter(row), getSection(row).session),
          },
        ]
      : []),
    {
      header: "Info",
      id: "info",
      cell: ({ row }) => renderInfoLink(row, testid),
    },
    {
      header: "Action",
      id: "action",
      cell: ({ row }) => (
        <Button
          size="sm"
          data-testid={`${testid}-row-${row.id}-show-enrollment-history`}
          onClick={() =>
            onShowEnrollmentHistory({
              quarter: getQuarter(row),
              courseId: (row.depth === 0
                ? row.original
                : row.getParentRow().original
              ).courseId,
              enrollCode: getSectionField(row, "enrollCode"),
            })
          }
        >
          Show History
        </Button>
      ),
    },
  ];
  return (
    <>
      <SectionsTableBase columns={columns} data={sections} testid={testid} />
    </>
  );
}
