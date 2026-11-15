import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  createEnrollmentBarChartData,
  createEnrollmentBarRows,
  hasPassData,
  roundedTopPath,
  TOTAL_BAR_COLOR,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

const PASS_LINES = [
  { key: "pass1", label: "End of Pass 1" },
  { key: "pass2", label: "End of Pass 2", dash: "4 3" },
];

// Above these counts, labels are drawn diagonally to fit.
const MAX_FLAT_LABELS = 6;
const MAX_FLAT_TIMES = 12;

// A bar with its pass lines, capped at the top of the bar.
export const PassMarkerBar = ({ x, y, width, height, payload }) => {
  if (payload.isSpacer) {
    return null;
  }
  const pixelsPerStudent = height / payload.enrollment;
  return (
    <g data-testid={`enrollment-bar-${payload.key}`}>
      <path d={roundedTopPath(x, y, width, height)} fill={payload.color} />
      {payload.enrollment > 0 &&
        PASS_LINES.filter((line) => payload[line.key] != null).map((line) => {
          const value = Math.min(payload[line.key], payload.enrollment);
          const lineY = y + height - value * pixelsPerStudent;
          return (
            <line
              key={line.key}
              data-testid={`pass-marker-${payload.key}-${line.key}`}
              // Stryker disable all: line styling
              x1={x}
              x2={x + width}
              y1={lineY}
              y2={lineY}
              stroke="#212529"
              strokeWidth={2}
              strokeDasharray={line.dash}
              // Stryker restore all
            />
          );
        })}
    </g>
  );
};

// A section bar's meeting time under the bar, and the instructor's name
// centered under the class's bars. The tick sits under each bar, so the name
// (on the class's first bar) shifts right by half the remaining bars' width.
export const EnrollmentBarTick = ({
  x,
  y,
  width,
  visibleTicksCount,
  payload,
  rows,
  diagonal,
  fontSize,
  timesDiagonal,
  timeSpace,
}) => {
  const row = rows.find((r) => r.key === payload.value);
  const centerX = x + ((row.groupSize - 1) / 2) * (width / visibleTicksCount);
  const nameY = y + timeSpace;
  return (
    <g>
      {row.timeLabel && (
        <text
          x={x}
          y={y}
          // Stryker disable all: label styling
          dy={12}
          transform={timesDiagonal ? `rotate(-35, ${x}, ${y})` : undefined}
          textAnchor={timesDiagonal ? "end" : "middle"}
          fontSize={11}
          fill="#495057"
          // Stryker restore all
        >
          {row.timeLabel}
        </text>
      )}
      {row.groupLabel && (
        <text
          x={centerX}
          y={nameY}
          // Stryker disable all: label styling
          dy={fontSize + 2}
          transform={diagonal ? `rotate(-35, ${centerX}, ${nameY})` : undefined}
          textAnchor={diagonal ? "end" : "middle"}
          fontSize={fontSize}
          fontWeight="bold"
          // Stryker restore all
        >
          {row.groupLabel}
        </text>
      )}
    </g>
  );
};

export const EnrollmentLegend = () => {
  return (
    <div
      data-testid="enrollment-legend"
      className="d-flex flex-wrap gap-3 small"
    >
      <span>
        <svg width={12} height={12} className="me-1">
          <rect width={12} height={12} rx={2} fill={TOTAL_BAR_COLOR} />
        </svg>
        Total
      </span>
      {PASS_LINES.map((line) => (
        <span key={line.key}>
          <svg width={24} height={12} className="me-1">
            <line
              x1={0}
              x2={24}
              y1={6}
              y2={6}
              stroke="#212529"
              strokeWidth={2}
              strokeDasharray={line.dash}
            />
          </svg>
          {line.label}
        </span>
      ))}
    </div>
  );
};

const EnrollmentHistoryGraph = ({
  data,
  yyyyq,
  passDates = {},
  instructors = {},
  sectionTimes = {},
  title = "Enrollment History",
}) => {
  const classes = createEnrollmentBarChartData(data, yyyyq, passDates);
  const rows = createEnrollmentBarRows(classes, instructors, sectionTimes);
  const diagonal = classes.length > MAX_FLAT_LABELS;
  const labelFontSize = classes.length <= 2 ? 18 : 12;
  const timesDiagonal = rows.length > MAX_FLAT_TIMES;
  const hasTimes = rows.some((row) => row.timeLabel);
  // Room under the bars for the time labels, above the instructor names
  const timeSpace = hasTimes ? (timesDiagonal ? 60 : 20) : 0;

  return (
    <div data-testid="enrollment-history-graph">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>No enrollment data for this quarter.</p>
      ) : (
        <>
          <ResponsiveContainer
            width="100%"
            height={timeSpace + (diagonal ? 440 : 360)}
          >
            <BarChart
              data={rows}
              // Stryker disable all
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="10%"
            >
              <XAxis
                dataKey="key"
                interval={0}
                tickLine={false}
                height={timeSpace + (diagonal ? 120 : 45)}
                tick={
                  <EnrollmentBarTick
                    rows={rows}
                    diagonal={diagonal}
                    fontSize={labelFontSize}
                    timesDiagonal={timesDiagonal}
                    timeSpace={timeSpace}
                  />
                }
              />
              <YAxis allowDecimals={false} />
              <Bar
                dataKey="enrollment"
                shape={<PassMarkerBar />}
                isAnimationActive={false}
                // Stryker restore all
              />
            </BarChart>
          </ResponsiveContainer>
          <EnrollmentLegend />
          {!hasPassData(rows) && (
            <p className="small text-muted mt-2">
              No pass lines: there is no enrollment data from before the end of
              Pass 1 or Pass 2 for this quarter.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default EnrollmentHistoryGraph;
