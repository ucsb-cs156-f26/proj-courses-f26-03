import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  createEnrollmentBarChartData,
  createEnrollmentBarRows,
  getMaxSectionCount,
  getSectionBarColor,
  TOTAL_BAR_COLOR,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

// Pass 1 is solid, pass 2 is dotted; the legend says which is which.
const PASS_LINES = [
  { key: "pass1", label: "End of Pass 1", dash: undefined },
  { key: "pass2", label: "End of Pass 2", dash: "4 3" },
];

// Above this many classes, instructor names are drawn diagonally to fit.
const MAX_FLAT_LABELS = 6;

// Draws one bar in its color, with a line at the pass 1 and pass 2 values.
// A pass value above the final enrollment is drawn at the top of the bar.
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

// X-axis label: the instructor's name, bold, under each class's middle bar.
export const EnrollmentBarTick = ({ x, y, payload, rows, diagonal }) => {
  const label = rows.find((r) => r.key === payload.value)?.groupLabel;
  if (!label) {
    return null;
  }
  return (
    // Stryker disable all: label styling
    <text
      x={x}
      y={y}
      dy={14}
      transform={diagonal ? `rotate(-35, ${x}, ${y})` : undefined}
      textAnchor={diagonal ? "end" : "middle"}
      fontSize={12}
      fontWeight="bold"
    >
      {label}
    </text>
    // Stryker restore all
  );
};

// Color key for sections and Total, plus the two pass line styles.
export const EnrollmentLegend = ({ sectionCount }) => {
  const items = [
    ...Array.from({ length: sectionCount }, (_, i) => ({
      label: `Section ${i + 1}`,
      color: getSectionBarColor(i),
    })),
    { label: "Total", color: TOTAL_BAR_COLOR },
  ];
  return (
    <div
      data-testid="enrollment-legend"
      className="d-flex flex-wrap gap-3 small"
    >
      {items.map((item) => (
        <span key={item.label}>
          <svg width={12} height={12} className="me-1">
            <rect width={12} height={12} fill={item.color} />
          </svg>
          {item.label}
        </span>
      ))}
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

// Bar chart of one quarter's enrollment, grouped by class.
const EnrollmentHistoryBarGraph = ({
  data,
  yyyyq,
  passDates = {},
  instructors = {},
  title = "Enrollment History",
}) => {
  const classes = createEnrollmentBarChartData(data, yyyyq, passDates);
  const rows = createEnrollmentBarRows(classes, instructors);
  const diagonal = classes.length > MAX_FLAT_LABELS;

  return (
    <div data-testid="enrollment-history-bar-graph">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>No enrollment data for this quarter.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={diagonal ? 440 : 360}>
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
                height={diagonal ? 120 : 40}
                tick={<EnrollmentBarTick rows={rows} diagonal={diagonal} />}
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
          <EnrollmentLegend sectionCount={getMaxSectionCount(classes)} />
        </>
      )}
    </div>
  );
};

export default EnrollmentHistoryBarGraph;
