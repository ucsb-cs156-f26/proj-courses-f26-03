import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  createEnrollmentBarChartData,
  createEnrollmentBarRows,
  getPassMarkers,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

// Draws one bar in its color, with a labelled line at each pass.
export const PassMarkerBar = ({ x, y, width, height, payload }) => {
  if (payload.isSpacer) {
    return null;
  }
  return (
    <g data-testid={`enrollment-bar-${payload.key}`}>
      <rect x={x} y={y} width={width} height={height} fill={payload.color} />
      {getPassMarkers(payload).map((marker) => {
        const markerY = y + height * (1 - marker.value / payload.enrollment);
        return (
          <g
            key={marker.label}
            data-testid={`pass-marker-${payload.key}-${marker.label}`}
          >
            {/* Stryker disable all: line and label styling */}
            <line
              x1={x}
              x2={x + width}
              y1={markerY}
              y2={markerY}
              stroke="#212529"
              strokeWidth={2}
            />
            <text
              x={x + 3}
              y={markerY - 3}
              fontSize={10}
              fill="#212529"
              stroke="white"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {marker.label}
            </text>
            {/* Stryker restore all */}
          </g>
        );
      })}
    </g>
  );
};

// X-axis label: the section name, plus the class name under its middle bar.
export const EnrollmentBarTick = ({ x, y, payload, rows }) => {
  const row = rows.find((r) => r.key === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Stryker disable all: label styling */}
      <text dy={12} textAnchor="middle" fontSize={11} fill="#495057">
        {row.label}
      </text>
      {row.groupLabel && (
        <text dy={30} textAnchor="middle" fontSize={12} fontWeight="bold">
          {row.groupLabel}
        </text>
      )}
      {/* Stryker restore all */}
    </g>
  );
};

// Bar chart of one quarter's enrollment, grouped by class.
const EnrollmentHistoryBarGraph = ({
  data,
  yyyyq,
  passDates = {},
  title = "Enrollment History",
}) => {
  const rows = createEnrollmentBarRows(
    createEnrollmentBarChartData(data, yyyyq, passDates),
  );

  return (
    <div data-testid="enrollment-history-bar-graph">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>No enrollment data for this quarter.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={rows}
              // Stryker disable all
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="10%"
            >
              <XAxis
                dataKey="key"
                interval={0}
                height={45}
                tick={<EnrollmentBarTick rows={rows} />}
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
          <p className="small text-muted">
            Blue bars are each class&apos;s total enrollment. Lines show
            enrollment at the end of Pass 1 (P1) and Pass 2 (P2); the top of
            each bar is the final enrollment.
          </p>
        </>
      )}
    </div>
  );
};

export default EnrollmentHistoryBarGraph;
