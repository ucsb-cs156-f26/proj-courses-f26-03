import { vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import CourseDetailsIndexPage from "main/pages/CourseDetails/CourseDetailsIndexPage";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import { personalSectionsFixtures } from "fixtures/personalSectionsFixtures";
import { oneQuarterCourse } from "fixtures/gradeHistoryFixtures";
import {
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
} from "fixtures/enrollmentDataPointFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async () => {
  const originalModule = await vi.importActual("react-toastify");
  return {
    __esModule: true,
    ...originalModule,
    toast: (x) => mockToast(x),
  };
});
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const originalModule = await vi.importActual("react-router-dom");
  return {
    __esModule: true,
    ...originalModule,
    useParams: () => ({
      qtr: "20221",
      enrollCode: "06619",
    }),
    Navigate: (x) => {
      mockNavigate(x);
      return null;
    },
  };
});

class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Mock implementation of the observe method
  }
  unobserve() {
    // Mock implementation of the unobserve method
  }
  disconnect() {
    // Mock implementation of the disconnect method
  }
}

window.ResizeObserver = ResizeObserver;

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

describe("CourseDetailsIndexPage tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);
  // Sample data relabelled as CHEM 184 in W22/S22, plus a CHEM 184A point
  const quarterMap = { 20262: "20221", 20264: "20222" };
  const chem184EnrollmentHistory = [
    ...enrollmentBarChartFixtures.twoQuarters.map((dataPoint) => ({
      ...dataPoint,
      yyyyq: quarterMap[dataPoint.yyyyq],
      courseId: "CHEM    184 -1",
    })),
    {
      id: 9999,
      yyyyq: "20221",
      enrollCd: "99999",
      courseId: "CHEM    184A-1",
      section: "0300",
      enrollment: 5,
      dateCreated: "2026-04-01T08:15:00.000000",
    },
  ];
  const allQuartersResponse = [
    { ...enrollmentPassDatesFixtures.spring2026, quarter: "20221" },
    { ...enrollmentPassDatesFixtures.fall2026, quarter: "20222" },
  ];
  let queryClient;
  let enrollmentHistoryResponse;

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CourseDetailsIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.spyOn(console, "error");
    console.error.mockImplementation(() => null);
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    enrollmentHistoryResponse = chem184EnrollmentHistory;
    localStorage.clear();
    mockToast.mockClear();
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
    axiosMock
      .onGet("/api/sections/sectionsearch", {
        params: { qtr: "20221", enrollCode: "06619" },
      })
      .reply(200, personalSectionsFixtures.singleSection);
    axiosMock
      .onGet("/api/public/finalsInfo", {
        params: { quarterYYYYQ: "20221", enrollCd: "06619" },
      })
      .reply(200, null);
    axiosMock
      .onGet("/api/gradehistory/search", {
        params: { subjectArea: "", courseNumber: "" },
      })
      .reply(200, []);
    axiosMock
      .onGet("/api/gradehistory/search", {
        params: { subjectArea: "CHEM", courseNumber: "184" },
      })
      .reply(200, oneQuarterCourse);
    axiosMock
      .onGet("/api/enrollment/search", {
        params: {
          startQtr: "20084",
          endQtr: "20222",
          subjectArea: "CHEM",
          courseNumber: "184",
        },
      })
      .reply(() => [200, enrollmentHistoryResponse]);
    axiosMock.onGet("/api/public/allQuarters").reply(200, allQuartersResponse);
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  test("renders without crashing", () => {
    renderPage();
  });

  test("Calls UCSB Section Search api correctly and displays correct information", async () => {
    renderPage();

    expect(
      await screen.findByText("Course Details for CHEM 184 W22"),
    ).toBeInTheDocument();

    expect(screen.getByText("Enroll Code")).toBeInTheDocument();
    expect(screen.getByText("06619")).toBeInTheDocument();
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText("0100")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("CHEM LITERATURE")).toBeInTheDocument();
    expect(screen.getByText("Enrolled")).toBeInTheDocument();
    expect(screen.getByText("19/24")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("LIB 1312")).toBeInTheDocument();
    expect(screen.getByText("Days")).toBeInTheDocument();
    expect(screen.getByText("T R")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("2:00 PM - 3:15 PM")).toBeInTheDocument();
  });

  test("Calls grade history api correctly and displays correct information", async () => {
    renderPage();

    expect(
      await screen.findByText("Fall 2009 - GONZALEZ T F"),
    ).toBeInTheDocument();
  });

  test("requests enrollment history for every section and quarter of the course", async () => {
    renderPage();

    await waitFor(() => {
      expect(
        axiosMock.history.get.some(
          (request) => request.url === "/api/enrollment/search",
        ),
      ).toBe(true);
    });

    const enrollmentHistoryRequest = axiosMock.history.get.find(
      (request) => request.url === "/api/enrollment/search",
    );

    expect(enrollmentHistoryRequest.params).toEqual({
      startQtr: "20084",
      endQtr: "20222",
      subjectArea: "CHEM",
      courseNumber: "184",
    });
  });

  test("shows every section of the page's quarter as a bar", async () => {
    renderPage();

    expect(
      await screen.findByTestId("enrollment-bar-0100-0101"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("enrollment-bar-0100-total")).toBeInTheDocument();
    expect(screen.getByText("Enrollment History – W22")).toBeInTheDocument();
  });

  test("leaves out other courses that share the course number prefix", async () => {
    renderPage();

    expect(
      await screen.findByTestId("enrollment-bar-0100-total"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("enrollment-bar-0300-total"),
    ).not.toBeInTheDocument();
  });

  test("switches the graph to the quarter picked in the dropdown", async () => {
    renderPage();

    const dropdown = await screen.findByTestId(
      "CourseDetails.EnrollmentQuarter",
    );
    expect(
      await screen.findByTestId("CourseDetails.EnrollmentQuarter-option-1"),
    ).toBeInTheDocument();
    expect(dropdown).toHaveValue("20221");
    expect(
      screen.getByTestId("CourseDetails.EnrollmentQuarter-option-0"),
    ).toHaveTextContent("W22");
    expect(
      screen.getByTestId("CourseDetails.EnrollmentQuarter-option-1"),
    ).toHaveTextContent("S22");
    expect(
      await screen.findByTestId("enrollment-bar-0100-0101"),
    ).toBeInTheDocument();

    fireEvent.change(dropdown, { target: { value: "20222" } });

    expect(
      await screen.findByText("Enrollment History – S22"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("enrollment-bar-0100-total")).toBeInTheDocument();
    expect(
      screen.queryByTestId("enrollment-bar-0100-0101"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("pass-marker-0100-total-P1")).toBeInTheDocument();
  });

  test("offers the page's quarter even when it has no enrollment data", async () => {
    enrollmentHistoryResponse = [];
    renderPage();

    expect(
      await screen.findByText("No enrollment data for this quarter."),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("CourseDetails.EnrollmentQuarter-option-0"),
    ).toHaveTextContent("W22");
    expect(
      screen.queryByTestId("CourseDetails.EnrollmentQuarter-option-1"),
    ).not.toBeInTheDocument();
  });

  test("renders enrollment history graph between course description and grade history", async () => {
    renderPage();

    const courseDescription = await screen.findByText("Course Description");
    const enrollmentHistorySection = await screen.findByTestId(
      "enrollment-history-section",
    );
    const gradeHistoryGraphs = await screen.findByTestId(
      "grade-history-graphs",
    );

    expect(
      screen.getByTestId("enrollment-history-bar-graph"),
    ).toBeInTheDocument();
    expect(
      courseDescription.compareDocumentPosition(enrollmentHistorySection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      enrollmentHistorySection.compareDocumentPosition(gradeHistoryGraphs) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
