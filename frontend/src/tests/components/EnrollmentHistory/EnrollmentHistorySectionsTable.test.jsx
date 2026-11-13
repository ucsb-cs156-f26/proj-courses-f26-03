import { vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import EnrollmentHistorySectionsTable from "main/components/EnrollmentHistory/EnrollmentHistorySectionsTable";
import primaryFixtures from "fixtures/primaryFixtures";

describe("EnrollmentHistorySectionsTable tests", () => {
  const testid = "EnrollmentHistorySectionsTable";
  const cell = (row, col) =>
    screen.getByTestId(`${testid}-cell-row-${row}-col-${col}`);

  const renderTable = (props) =>
    render(
      <MemoryRouter>
        <EnrollmentHistorySectionsTable
          sections={primaryFixtures.f24_math_lowerDiv}
          {...props}
        />
      </MemoryRouter>,
    );

  test("renders all column headers and no session column by default", () => {
    renderTable();
    [
      "Quarter",
      "Course ID",
      "Title",
      "Status",
      "Enrolled",
      "Location",
      "Days",
      "Time",
      "Instructor",
      "Enroll Code",
      "Info",
      "Action",
    ].forEach((name) =>
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument(),
    );
    expect(screen.queryByText("Session")).not.toBeInTheDocument();
  });

  test("renders the expected cell values for a lecture row", () => {
    renderTable();
    expect(cell(0, "quarter")).toHaveTextContent("F24");
    expect(cell(0, "courseId")).toHaveTextContent("MATH 2A");
    expect(cell(0, "title")).toHaveTextContent("CALC W/ ALG & TRIG");
    expect(cell(0, "status")).toHaveTextContent("Open");
    expect(cell(0, "enrolled")).toHaveTextContent("172/175");
    expect(cell(0, "location")).toHaveTextContent("ILP 2101");
    expect(cell(0, "days")).toHaveTextContent("M W F");
    expect(cell(0, "time")).toHaveTextContent("8:00 AM - 8:50 AM");
    expect(cell(0, "instructor")).toHaveTextContent("PORTER M J");
    expect(cell(0, "enrollCode")).toHaveTextContent("30247");
    expect(
      within(cell(0, "info")).getByTestId(`${testid}-row-0-col-info-link`),
    ).toHaveAttribute("href", "/coursedetails/20244/30247");
  });

  test("hides the lecture suffix from the course id", () => {
    const sections = [
      { ...primaryFixtures.f24_math_lowerDiv[0], courseId: "MATH      2A -1" },
    ];
    renderTable({ sections });
    expect(cell(0, "courseId")).toHaveTextContent(/^MATH 2A$/);
  });

  test("renders section rows with an empty quarter cell when expanded", async () => {
    renderTable();
    await userEvent.click(screen.getByTestId(`${testid}-expand-all-rows`));
    expect(cell("0.0", "quarter")).toHaveTextContent("");
    expect(cell("0.0", "enrollCode")).toHaveTextContent("30254");
  });

  test("expand all and row expand buttons toggle their icons", async () => {
    renderTable();
    const expandAll = screen.getByTestId(`${testid}-expand-all-rows`);
    const rowButton = screen.getByTestId(`${testid}-row-0-expand-button`);

    expect(expandAll).toHaveTextContent("➕");
    expect(rowButton).toHaveTextContent("➕");
    expect(rowButton).toHaveAttribute("style", "cursor: pointer;");

    await userEvent.click(expandAll);
    expect(expandAll).toHaveTextContent("➖");
    expect(rowButton).toHaveTextContent("➖");

    await userEvent.click(rowButton);
    expect(rowButton).toHaveTextContent("➕");
  });

  test("lectures with no sections cannot expand", () => {
    renderTable({
      sections: primaryFixtures.singleLectureSectionWithNoDiscussion,
    });
    expect(
      screen.getByTestId(`${testid}-row-0-cannot-expand`),
    ).toBeInTheDocument();
  });

  test("renders the session column when showSession is set", () => {
    const summerPrimary = [
      {
        ...primaryFixtures.singleLectureSectionWithNoDiscussion[0],
        quarter: "20243",
        primary: {
          ...primaryFixtures.singleLectureSectionWithNoDiscussion[0].primary,
          session: "00000A",
        },
      },
    ];
    renderTable({ sections: summerPrimary, showSession: true });
    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(cell(0, "session")).toHaveTextContent("A");
  });

  test("renders a show history button and no add button on every row", async () => {
    renderTable();
    await userEvent.click(screen.getByTestId(`${testid}-expand-all-rows`));

    expect(
      screen.getByTestId(`${testid}-row-0-show-enrollment-history`),
    ).toHaveTextContent("Show History");
    expect(
      screen.getByTestId(`${testid}-row-0.0-show-enrollment-history`),
    ).toBeInTheDocument();
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
  });

  test("calls onShowEnrollmentHistory with the lecture's info", async () => {
    const onShow = vi.fn();
    renderTable({ onShowEnrollmentHistory: onShow });

    await userEvent.click(
      screen.getByTestId(`${testid}-row-0-show-enrollment-history`),
    );

    expect(onShow).toHaveBeenCalledWith({
      quarter: "20244",
      courseId: "MATH      2A ",
      enrollCode: "30247",
    });
  });

  test("calls onShowEnrollmentHistory with the parent's courseId for a section row", async () => {
    const onShow = vi.fn();
    renderTable({ onShowEnrollmentHistory: onShow });

    await userEvent.click(screen.getByTestId(`${testid}-row-0-expand-button`));
    await userEvent.click(
      screen.getByTestId(`${testid}-row-0.0-show-enrollment-history`),
    );

    expect(onShow).toHaveBeenCalledWith({
      quarter: "20244",
      courseId: "MATH      2A ",
      enrollCode: "30254",
    });
  });

  test("does not throw when no callback is provided", async () => {
    renderTable();
    await userEvent.click(
      screen.getByTestId(`${testid}-row-0-show-enrollment-history`),
    );
  });
});
