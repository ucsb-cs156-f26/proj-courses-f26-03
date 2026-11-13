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
        instructors={{ "0100": "CONRAD P T" }}
        title="CMPSC 130A Enrollment"
      />,
    );

    expect(screen.getByText("CMPSC 130A Enrollment")).toBeInTheDocument();
    expect(
      await screen.findByTestId("enrollment-bar-0100-0101"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("enrollment-bar-0200-0203")).toBeInTheDocument();
    expect(screen.getByTestId("enrollment-bar-0200-total")).toBeInTheDocument();
    expect(screen.getByText("CONRAD P T")).toBeInTheDocument();
    expect(screen.getByText("Lecture 0200")).toBeInTheDocument();
    expect(screen.getAllByText("Section 1").length).toBeGreaterThan(0);
    expect(
      screen.getByTestId("pass-marker-0100-total-pass2"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Blue bars are each lecture/)).toBeInTheDocument();
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
    const p1 = screen.getByTestId("pass-marker-0100-0101-pass1");
    expect(p1).toHaveAttribute("x1", "10");
    expect(p1).toHaveAttribute("x2", "50");
    expect(p1).toHaveAttribute("y1", "160");
    expect(p1).toHaveAttribute("y2", "160");
    expect(p1).toHaveAttribute("stroke-dasharray", "4 3");
    // 75 of 100: 220 - 150 = 70; a line above the bar is allowed
    const p2 = screen.getByTestId("pass-marker-0100-0101-pass2");
    expect(p2).toHaveAttribute("y1", "70");
    expect(p2).not.toHaveAttribute("stroke-dasharray");
  });

  test("skips unknown passes and empty bars", () => {
    renderInSvg(
      <>
        <PassMarkerBar
          x={0}
          y={0}
          width={10}
          height={100}
          payload={{ ...row, pass1: null }}
        />
        <PassMarkerBar
          x={0}
          y={0}
          width={10}
          height={0}
          payload={{ ...row, key: "empty", enrollment: 0 }}
        />
      </>,
    );
    expect(screen.queryByTestId("pass-marker-0100-0101-pass1")).toBeNull();
    expect(
      screen.getByTestId("pass-marker-0100-0101-pass2"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("pass-marker-empty-pass1")).toBeNull();
    expect(screen.queryByTestId("pass-marker-empty-pass2")).toBeNull();
  });

  test("draws nothing for a gap", () => {
    const { container } = renderInSvg(
      <PassMarkerBar payload={{ key: "gap-0200", isSpacer: true }} />,
    );
    expect(container.querySelector("rect")).toBeNull();
  });
});

describe("EnrollmentBarTick", () => {
  test("shows the bar's label rotated at the tick position", () => {
    renderInSvg(
      <EnrollmentBarTick
        x={5}
        y={6}
        payload={{ value: "0100-0101" }}
        rows={[{ key: "0100-0101", label: "Section 1" }]}
      />,
    );
    const label = screen.getByText("Section 1");
    expect(label).toHaveAttribute("x", "5");
    expect(label).toHaveAttribute("y", "6");
    expect(label).toHaveAttribute("transform", "rotate(-40, 5, 6)");
  });
});
