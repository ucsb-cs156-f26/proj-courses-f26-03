import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
} from "fixtures/enrollmentDataPointFixtures";
import EnrollmentHistoryGraph, {
  EnrollmentBarTick,
  EnrollmentLegend,
  PassMarkerBar,
} from "main/components/EnrollmentHistory/EnrollmentHistoryGraph";
import {
  roundedTopPath,
  sectionBarColors,
  TOTAL_BAR_COLOR,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

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

describe("EnrollmentHistoryGraph", () => {
  test("draws a bar for every discussion and Total, grouped by class", async () => {
    render(
      <EnrollmentHistoryGraph
        data={enrollmentBarChartFixtures.twoLecturesWithSections}
        yyyyq="20262"
        passDates={enrollmentPassDatesFixtures.spring2026}
        instructors={{ "0100": "CONRAD P T" }}
        sectionTimes={{ "0101": "R 2:00PM" }}
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
    expect(screen.getByTestId("enrollment-legend")).toBeInTheDocument();
    expect(
      screen.getByTestId("pass-marker-0100-total-pass2"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No pass lines/)).not.toBeInTheDocument();
    // Two lectures: names are big and flat
    expect(screen.getByText("CONRAD P T")).toHaveAttribute("font-size", "18");
    expect(screen.getByText("CONRAD P T")).not.toHaveAttribute("transform");
    // Sections show their time, or their position if the time is unknown
    expect(screen.getByText("R 2:00PM")).not.toHaveAttribute("transform");
    expect(screen.getAllByText("Section 2")).toHaveLength(2);
  });

  // Lectures 0100, 0200, ... with the given number of discussion sections
  const lecturesWithSections = (sectionCounts) =>
    sectionCounts.flatMap((count, i) =>
      Array.from({ length: count + 1 }, (_, j) => ({
        yyyyq: "20262",
        courseId: "CMPSC   130A -1",
        section: `0${i + 1}0${j}`,
        enrollment: 20,
        dateCreated: "2026-11-06T00:00:00",
      })),
    );
  const chartHeight = (container) =>
    container.querySelector(".recharts-wrapper").style.height;

  test("leaves room for flat time labels when there are few bars", async () => {
    // 6 + gap + 5 = 12 bars
    const { container } = render(
      <EnrollmentHistoryGraph
        data={lecturesWithSections([5, 4])}
        yyyyq="20262"
      />,
    );
    expect((await screen.findAllByText("Section 1"))[0]).not.toHaveAttribute(
      "transform",
    );
    expect(chartHeight(container)).toBe("380px");
  });

  test("tilts time labels and leaves more room when there are many bars", async () => {
    // 6 + gap + 6 = 13 bars
    const { container } = render(
      <EnrollmentHistoryGraph
        data={lecturesWithSections([5, 5])}
        yyyyq="20262"
      />,
    );
    expect(
      (await screen.findAllByText("Section 1"))[0].getAttribute("transform"),
    ).toMatch(/^rotate\(-35/);
    expect(chartHeight(container)).toBe("420px");
  });

  test("uses small diagonal names for many lectures", async () => {
    const data = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
      yyyyq: "20262",
      courseId: "WRIT      2  -1",
      section: `0${n}00`,
      enrollment: 20,
      dateCreated: "2026-11-06T00:00:00",
    }));
    const { container } = render(
      <EnrollmentHistoryGraph data={data} yyyyq="20262" />,
    );
    const label = await screen.findByText("Lecture 0700");
    expect(label).toHaveAttribute("font-size", "12");
    expect(label.getAttribute("transform")).toMatch(/^rotate\(-35/);
    // No sections, so no room for time labels
    expect(chartHeight(container)).toBe("440px");
  });

  test("explains missing pass lines when no bar has pass data", async () => {
    render(
      <EnrollmentHistoryGraph
        data={enrollmentBarChartFixtures.twoLecturesWithSections}
        yyyyq="20262"
      />,
    );
    expect(await screen.findByText(/No pass lines/)).toBeInTheDocument();
  });

  test("uses the default title and shows a message when there is no data", () => {
    render(<EnrollmentHistoryGraph yyyyq="20262" />);
    expect(screen.getByText("Enrollment History")).toBeInTheDocument();
    expect(
      screen.getByText("No enrollment data for this quarter."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("enrollment-legend")).not.toBeInTheDocument();
  });
});

describe("roundedTopPath", () => {
  test("rounds the top corners by up to 6px", () => {
    expect(roundedTopPath(10, 20, 40, 200)).toBe(
      "M10,220 V26 Q10,20 16,20 H44 Q50,20 50,26 V220 Z",
    );
  });

  test("keeps the rounding within narrow or short bars", () => {
    // Narrow: radius is half the width
    expect(roundedTopPath(0, 0, 4, 100)).toBe(
      "M0,100 V2 Q0,0 2,0 H2 Q4,0 4,2 V100 Z",
    );
    // Short: radius is the height
    expect(roundedTopPath(0, 0, 40, 3)).toBe(
      "M0,3 V3 Q0,0 3,0 H37 Q40,0 40,3 V3 Z",
    );
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
    const bar = screen
      .getByTestId("enrollment-bar-0100-0101")
      .querySelector("path");
    expect(bar).toHaveAttribute("d", roundedTopPath(10, 20, 40, 200));
    expect(bar).toHaveAttribute("fill", sectionBarColors[0]);

    // 30 of 100 students is 30% up from the bottom: 220 - 60 = 160
    const p1 = screen.getByTestId("pass-marker-0100-0101-pass1");
    expect(p1).toHaveAttribute("x1", "10");
    expect(p1).toHaveAttribute("x2", "50");
    expect(p1).toHaveAttribute("y1", "160");
    expect(p1).toHaveAttribute("y2", "160");
    expect(p1).not.toHaveAttribute("stroke-dasharray");
    // 75 of 100: 220 - 150 = 70
    const p2 = screen.getByTestId("pass-marker-0100-0101-pass2");
    expect(p2).toHaveAttribute("y1", "70");
    expect(p2).toHaveAttribute("stroke-dasharray", "4 3");
  });

  test("caps a pass line above the final enrollment at the top of the bar", () => {
    renderInSvg(
      <PassMarkerBar
        x={10}
        y={20}
        width={40}
        height={200}
        payload={{ ...row, pass2: 120 }}
      />,
    );
    expect(screen.getByTestId("pass-marker-0100-0101-pass2")).toHaveAttribute(
      "y1",
      "20",
    );
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
    expect(container.querySelector("path")).toBeNull();
  });
});

describe("EnrollmentBarTick", () => {
  const rows = [
    {
      key: "0100-0101",
      timeLabel: "R 2:00PM",
      groupLabel: "CONRAD P T",
      groupSize: 4,
    },
    { key: "0100-0102", timeLabel: "R 3:00PM" },
    { key: "0200-total", groupLabel: "WANG R K", groupSize: 1 },
    { key: "gap-0200" },
  ];
  // 10 bars across 500px: bars are 50px apart
  const tickProps = {
    y: 6,
    width: 500,
    visibleTicksCount: 10,
    rows,
    timeSpace: 20,
  };

  test("centers the name under all of the class's bars, below the times", () => {
    renderInSvg(
      <EnrollmentBarTick
        {...tickProps}
        x={100}
        payload={{ value: "0100-0101" }}
        fontSize={18}
      />,
    );
    // 4 bars: middle is 1.5 bars (75px) right of the first
    const label = screen.getByText("CONRAD P T");
    expect(label).toHaveAttribute("x", "175");
    expect(label).toHaveAttribute("y", "26");
    expect(label).toHaveAttribute("font-size", "18");
    expect(label).toHaveAttribute("font-weight", "bold");
    expect(label).toHaveAttribute("text-anchor", "middle");
    expect(label).not.toHaveAttribute("transform");

    const time = screen.getByText("R 2:00PM");
    expect(time).toHaveAttribute("x", "100");
    expect(time).toHaveAttribute("y", "6");
    expect(time).toHaveAttribute("text-anchor", "middle");
    expect(time).not.toHaveAttribute("transform");
  });

  test("tilts the time when asked", () => {
    renderInSvg(
      <EnrollmentBarTick
        {...tickProps}
        x={100}
        payload={{ value: "0100-0102" }}
        timesDiagonal
      />,
    );
    const time = screen.getByText("R 3:00PM");
    expect(time).toHaveAttribute("transform", "rotate(-35, 100, 6)");
    expect(time).toHaveAttribute("text-anchor", "end");
  });

  test("keeps a one-bar class's name under its bar, diagonal when asked", () => {
    renderInSvg(
      <EnrollmentBarTick
        {...tickProps}
        x={100}
        payload={{ value: "0200-total" }}
        diagonal
        fontSize={12}
      />,
    );
    const label = screen.getByText("WANG R K");
    expect(label).toHaveAttribute("x", "100");
    expect(label).toHaveAttribute("transform", "rotate(-35, 100, 26)");
  });

  test("draws nothing under a gap", () => {
    const { container } = renderInSvg(
      <EnrollmentBarTick {...tickProps} payload={{ value: "gap-0200" }} />,
    );
    expect(container.querySelector("text")).toBeNull();
  });
});

describe("EnrollmentLegend", () => {
  test("lists Total and both pass lines", () => {
    const { container } = render(<EnrollmentLegend />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("End of Pass 1")).toBeInTheDocument();
    expect(screen.getByText("End of Pass 2")).toBeInTheDocument();
    expect(screen.queryByText(/Section/)).not.toBeInTheDocument();
    expect(container.querySelector("rect")).toHaveAttribute(
      "fill",
      TOTAL_BAR_COLOR,
    );
    const dashes = [...container.querySelectorAll("line")].map((l) =>
      l.getAttribute("stroke-dasharray"),
    );
    expect(dashes).toEqual([null, "4 3"]);
  });
});
