import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  createEnrollmentBarChartData,
  createEnrollmentBarRows,
  getMaxSectionCount,
  getSectionBarColor,
  hasPassData,
  TOTAL_BAR_COLOR,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

const PASS_LINES = [
  { key: "pass1", label: "End of Pass 1" },
  { key: "pass2", label: "End of Pass 2", dash: "4 3" },
];

// Above this many classes, instructor names are drawn diagonally to fit.
const MAX_FLAT_LABELS = 6;

// A bar with its pass lines, capped at the top of the bar.
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

// Instructor name centered under a class's bars. The tick sits under the
// class's first bar, so shift right by half the width of the remaining bars.
export const EnrollmentBarTick = ({
  x,
  y,
  width,
  visibleTicksCount,
  payload,
  rows,
  diagonal,
  fontSize,
}) => {
  const row = rows.find((r) => r.key === payload.value);
  if (!row?.groupLabel) {
    return null;
  }
  const centerX = x + ((row.groupSize - 1) / 2) * (width / visibleTicksCount);
  return (
    <text
      x={centerX}
      y={y}
      // Stryker disable all: label styling
      dy={fontSize + 2}
      transform={diagonal ? `rotate(-35, ${centerX}, ${y})` : undefined}
      textAnchor={diagonal ? "end" : "middle"}
      fontSize={fontSize}
      fontWeight="bold"
      // Stryker restore all
    >
      {row.groupLabel}
    </text>
  );
};

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
  const labelFontSize = classes.length <= 2 ? 18 : 12;

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
                height={diagonal ? 120 : 45}
                tick={
                  <EnrollmentBarTick
                    rows={rows}
                    diagonal={diagonal}
                    fontSize={labelFontSize}
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
          <EnrollmentLegend sectionCount={getMaxSectionCount(classes)} />
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

export default EnrollmentHistoryBarGraph;
