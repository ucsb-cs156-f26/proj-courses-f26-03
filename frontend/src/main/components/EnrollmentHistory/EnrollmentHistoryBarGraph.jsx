import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  createEnrollmentBarChartData,
  createEnrollmentBarRows,
  getMaxEnrollment,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

// Pass 1 is dashed, pass 2 is solid; no text labels so they never overlap.
const PASS_LINES = [
  { key: "pass1", dash: "4 3" },
  { key: "pass2", dash: undefined },
];

// Draws one bar in its color, with a line at the pass 1 and pass 2 values.
export const PassMarkerBar = ({ x, y, width, height, payload }) => {
  if (payload.isSpacer) {
    return null;
  }
  const pixelsPerStudent =
    payload.enrollment > 0 ? height / payload.enrollment : 0;
  return (
    <g data-testid={`enrollment-bar-${payload.key}`}>
      <rect x={x} y={y} width={width} height={height} fill={payload.color} />
      {pixelsPerStudent > 0 &&
        PASS_LINES.filter((line) => payload[line.key] != null).map((line) => {
          const lineY = y + height - payload[line.key] * pixelsPerStudent;
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

// X-axis label, drawn diagonally so long labels don't overlap.
export const EnrollmentBarTick = ({ x, y, payload, rows }) => {
  const row = rows.find((r) => r.key === payload.value);
  return (
    // Stryker disable all: label styling
    <text
      x={x}
      y={y}
      dy={10}
      transform={`rotate(-40, ${x}, ${y})`}
      textAnchor="end"
      fontSize={11}
      fill="#495057"
    >
      {row.label}
    </text>
    // Stryker restore all
  );
};

// Bar chart of one quarter's enrollment, grouped by class.
const EnrollmentHistoryBarGraph = ({
  data,
  yyyyq,
  passDates = {},
  instructors = {},
  title = "Enrollment History",
}) => {
  const rows = createEnrollmentBarRows(
    createEnrollmentBarChartData(data, yyyyq, passDates),
    instructors,
  );

  return (
    <div data-testid="enrollment-history-bar-graph">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>No enrollment data for this quarter.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart
              data={rows}
              // Stryker disable all
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="10%"
            >
              <XAxis
                dataKey="key"
                interval={0}
                height={110}
                tick={<EnrollmentBarTick rows={rows} />}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, getMaxEnrollment(rows)]}
              />
              <Bar
                dataKey="enrollment"
                shape={<PassMarkerBar />}
                isAnimationActive={false}
                // Stryker restore all
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="small text-muted">
            Blue bars are each lecture&apos;s total enrollment, labelled with
            the instructor; other colors are its sections. The dashed line is
            enrollment at the end of Pass 1 and the solid line at the end of
            Pass 2. A line above a bar means students dropped after that pass.
          </p>
        </>
      )}
    </div>
  );
};

export default EnrollmentHistoryBarGraph;
