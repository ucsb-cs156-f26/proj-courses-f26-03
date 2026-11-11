import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
} from "fixtures/enrollmentDataPointFixtures";
import EnrollmentHistoryBarGraph, {
  EnrollmentBarTick,
  PassMarkerBar,
} from "main/components/EnrollmentHistory/EnrollmentHistoryBarGraph";
import { sectionBarColors } from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("recharts", async () => {
  const OriginalModule = await vi.importActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ height, children }) => (
      <OriginalModule.ResponsiveContainer width={800} height={height}>
        {children}
      </OriginalModule.ResponsiveContainer>
    ),
  };
});

// Renders an SVG element on its own so it can be inspected
const renderInSvg = (element) => render(<svg>{element}</svg>);

describe("EnrollmentHistoryBarGraph", () => {
  test("draws a bar for every discussion and Total, grouped by class", async () => {
    render(
      <EnrollmentHistoryBarGraph
        data={enrollmentBarChartFixtures.twoLecturesWithSections}
        yyyyq="20262"
        passDates={enrollmentPassDatesFixtures.spring2026}
        title="CMPSC 130A Enrollment"
      />,
    );

    expect(screen.getByText("CMPSC 130A Enrollment")).toBeInTheDocument();
    expect(
      await screen.findByTestId("enrollment-bar-0100-0101"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("enrollment-bar-0200-0203")).toBeInTheDocument();
    expect(screen.getByTestId("enrollment-bar-0200-total")).toBeInTheDocument();
    expect(screen.getByText("Lecture 0100")).toBeInTheDocument();
    expect(screen.getByText("Lecture 0200")).toBeInTheDocument();
    expect(screen.getByTestId("pass-marker-0100-total-P2")).toBeInTheDocument();
    expect(screen.getByText(/Blue bars are each class/)).toBeInTheDocument();
  });

  test("uses the default title and shows a message when there is no data", () => {
    render(<EnrollmentHistoryBarGraph yyyyq="20262" />);
    expect(screen.getByText("Enrollment History")).toBeInTheDocument();
    expect(
      screen.getByText("No enrollment data for this quarter."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Blue bars/)).not.toBeInTheDocument();
  });
});

describe("PassMarkerBar", () => {
  const row = {
    key: "0100-0101",
    color: sectionBarColors[0],
    enrollment: 100,
    pass1: 30,
    pass2: 75,
  };

  test("draws the bar in its color with a line at each pass", () => {
    renderInSvg(
      <PassMarkerBar x={10} y={20} width={40} height={200} payload={row} />,
    );
    const rect = screen
      .getByTestId("enrollment-bar-0100-0101")
      .querySelector("rect");
    expect(rect).toHaveAttribute("x", "10");
    expect(rect).toHaveAttribute("y", "20");
    expect(rect).toHaveAttribute("width", "40");
    expect(rect).toHaveAttribute("height", "200");
    expect(rect).toHaveAttribute("fill", sectionBarColors[0]);

    // 30 of 100 students is 30% up from the bottom: 220 - 60 = 160
    const p1 = screen.getByTestId("pass-marker-0100-0101-P1");
    const p1Line = p1.querySelector("line");
    expect(p1Line).toHaveAttribute("x1", "10");
    expect(p1Line).toHaveAttribute("x2", "50");
    expect(p1Line).toHaveAttribute("y1", "160");
    expect(p1Line).toHaveAttribute("y2", "160");
    // Label sits just inside the bar, above the line
    const p1Label = p1.querySelector("text");
    expect(p1Label).toHaveTextContent("P1");
    expect(p1Label).toHaveAttribute("x", "13");
    expect(p1Label).toHaveAttribute("y", "157");
    // 75 of 100: 220 - 150 = 70
    expect(
      screen.getByTestId("pass-marker-0100-0101-P2").querySelector("line"),
    ).toHaveAttribute("y1", "70");
  });

  test("draws nothing for a gap", () => {
    const { container } = renderInSvg(
      <PassMarkerBar payload={{ key: "gap-0200", isSpacer: true }} />,
    );
    expect(container.querySelector("rect")).toBeNull();
  });
});

describe("EnrollmentBarTick", () => {
  const rows = [
    { key: "0100-0101", label: "0101" },
    { key: "0100-total", label: "Total", groupLabel: "Lecture 0100" },
  ];

  test("shows the section label at the tick position", () => {
    const { container } = renderInSvg(
      <EnrollmentBarTick
        x={5}
        y={6}
        payload={{ value: "0100-0101" }}
        rows={rows}
      />,
    );
    expect(screen.getByText("0101").parentElement).toHaveAttribute(
      "transform",
      "translate(5,6)",
    );
    expect(container.querySelectorAll("text")).toHaveLength(1);
  });

  test("shows the class name under the middle bar", () => {
    renderInSvg(
      <EnrollmentBarTick payload={{ value: "0100-total" }} rows={rows} />,
    );
    expect(screen.getByText("Lecture 0100")).toBeInTheDocument();
  });
});
