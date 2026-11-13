import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
} from "fixtures/enrollmentDataPointFixtures";
import EnrollmentHistoryBarGraph, {
  EnrollmentBarTick,
  EnrollmentLegend,
  PassMarkerBar,
} from "main/components/EnrollmentHistory/EnrollmentHistoryBarGraph";
import {
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
    expect(screen.getByTestId("enrollment-legend")).toBeInTheDocument();
    expect(
      screen.getByTestId("pass-marker-0100-total-pass2"),
    ).toBeInTheDocument();
  });

  test("uses the default title and shows a message when there is no data", () => {
    render(<EnrollmentHistoryBarGraph yyyyq="20262" />);
    expect(screen.getByText("Enrollment History")).toBeInTheDocument();
    expect(
      screen.getByText("No enrollment data for this quarter."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("enrollment-legend")).not.toBeInTheDocument();
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
    expect(container.querySelector("rect")).toBeNull();
  });
});

describe("EnrollmentBarTick", () => {
  const rows = [
    { key: "0100-0101" },
    { key: "0100-total", groupLabel: "CONRAD P T" },
  ];

  test("shows the instructor in bold under the class's middle bar", () => {
    renderInSvg(
      <EnrollmentBarTick
        x={5}
        y={6}
        payload={{ value: "0100-total" }}
        rows={rows}
      />,
    );
    const label = screen.getByText("CONRAD P T");
    expect(label).toHaveAttribute("x", "5");
    expect(label).toHaveAttribute("font-weight", "bold");
    expect(label).toHaveAttribute("text-anchor", "middle");
    expect(label).not.toHaveAttribute("transform");
  });

  test("draws the name diagonally when asked", () => {
    renderInSvg(
      <EnrollmentBarTick
        x={5}
        y={6}
        payload={{ value: "0100-total" }}
        rows={rows}
        diagonal
      />,
    );
    expect(screen.getByText("CONRAD P T")).toHaveAttribute(
      "transform",
      "rotate(-35, 5, 6)",
    );
  });

  test("draws nothing under other bars", () => {
    const { container } = renderInSvg(
      <EnrollmentBarTick payload={{ value: "0100-0101" }} rows={rows} />,
    );
    expect(container.querySelector("text")).toBeNull();
  });
});

describe("EnrollmentLegend", () => {
  test("lists each section color, Total, and both pass lines", () => {
    const { container } = render(<EnrollmentLegend sectionCount={2} />);
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Section 2")).toBeInTheDocument();
    expect(screen.queryByText("Section 3")).not.toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("End of Pass 1")).toBeInTheDocument();
    expect(screen.getByText("End of Pass 2")).toBeInTheDocument();
    const fills = [...container.querySelectorAll("rect")].map((r) =>
      r.getAttribute("fill"),
    );
    expect(fills).toEqual([
      sectionBarColors[0],
      sectionBarColors[1],
      TOTAL_BAR_COLOR,
    ]);
    const dashes = [...container.querySelectorAll("line")].map((l) =>
      l.getAttribute("stroke-dasharray"),
    );
    expect(dashes).toEqual([null, "4 3"]);
  });
});
