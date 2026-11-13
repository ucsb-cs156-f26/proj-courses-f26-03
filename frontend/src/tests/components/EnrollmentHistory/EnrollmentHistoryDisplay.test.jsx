import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import EnrollmentHistoryDisplay from "main/components/EnrollmentHistory/EnrollmentHistoryDisplay";

vi.mock("react-toastify", async () => {
  const originalModule = await vi.importActual("react-toastify");
  return { __esModule: true, ...originalModule, toast: vi.fn() };
});

vi.mock("main/components/EnrollmentHistory/EnrollmentHistoryGraph", () => ({
  default: ({ data, lineColors, title }) => (
    <div data-testid="enrollment-history-graph">
      <h3>{title}</h3>
      <span data-testid="graph-line-colors">{JSON.stringify(lineColors)}</span>
      <span data-testid="graph-data">{JSON.stringify(data)}</span>
    </div>
  ),
}));

describe("EnrollmentHistoryDisplay tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);
  const selection = {
    quarter: "20262",
    courseId: "CMPSC   130A ",
    enrollCode: "07609",
  };
  const dataPoint = {
    id: 1,
    yyyyq: "20262",
    enrollCd: "07609",
    courseId: "CMPSC   130A -1",
    section: "0100",
    enrollment: 32,
    dateCreated: "2026-04-06T08:15:00.000000",
  };

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  const renderDisplay = (sel = selection) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <EnrollmentHistoryDisplay selection={sel} />
      </QueryClientProvider>,
    );
  };

  test("shows loading, then the graph, and queries with the right params", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([200, [dataPoint]]), 50);
        }),
    );
    renderDisplay();

    expect(screen.getByTestId("enrollment-history-loading")).toHaveTextContent(
      "Loading enrollment history...",
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("enrollment-history-graph"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("enrollment-history-loading"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading").textContent).toBe(
      "Enrollment History for CMPSC   130A (07609)",
    );
    expect(screen.getByTestId("graph-line-colors")).toHaveTextContent(
      '["#0d6efd"]',
    );
    expect(screen.getByTestId("graph-data").textContent).toBe(
      JSON.stringify([dataPoint]),
    );
    expect(axiosMock.history.get[0].params).toEqual({
      startQtr: "20262",
      endQtr: "20262",
      subjectArea: "CMPSC",
      courseNumber: "130A",
      enrollCd: "07609",
    });
  });

  test("strips the lecture suffix from the course number", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(200, []);
    renderDisplay({ ...selection, courseId: "CMPSC   130A -1" });
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].params.courseNumber).toBe("130A");
  });

  test("hides the lecture suffix in the graph title", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(200, [dataPoint]);
    renderDisplay({ ...selection, courseId: "CMPSC   130A -1" });
    await waitFor(() =>
      expect(screen.getByRole("heading").textContent).toBe(
        "Enrollment History for CMPSC   130A (07609)",
      ),
    );
  });

  test("strips the lecture suffix even when followed by whitespace", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(200, []);
    renderDisplay({ ...selection, courseId: "CMPSC   130A -1 " });
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].params.courseNumber).toBe("130A");
  });

  test("parses multi-word subject areas", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(200, []);
    renderDisplay({ ...selection, courseId: "AS AM   10 " });
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].params.subjectArea).toBe("AS AM");
    expect(axiosMock.history.get[0].params.courseNumber).toBe("10");
  });

  test("shows an error message when the request fails", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(500);
    renderDisplay();
    expect(
      await screen.findByTestId("enrollment-history-error"),
    ).toHaveTextContent("Unable to load enrollment history.");
  });

  test("shows a no data message when the response is empty", async () => {
    axiosMock.onGet("/api/enrollment/search").reply(200, []);
    renderDisplay();
    expect(
      await screen.findByTestId("enrollment-history-empty"),
    ).toHaveTextContent(
      "No enrollment history data is available for this section.",
    );
  });

  test("shows a no data message when no data points match the enroll code", async () => {
    axiosMock
      .onGet("/api/enrollment/search")
      .reply(200, [{ ...dataPoint, enrollCd: "99999" }]);
    renderDisplay();
    expect(
      await screen.findByTestId("enrollment-history-empty"),
    ).toBeInTheDocument();
  });

  test("does not query when the selection has no enroll code", async () => {
    renderDisplay({ ...selection, enrollCode: "" });
    expect(
      await screen.findByTestId("enrollment-history-empty"),
    ).toBeInTheDocument();
    expect(axiosMock.history.get.length).toBe(0);
  });

  test("does not query when the selection has no subject area", async () => {
    renderDisplay({ ...selection, courseId: "  130A" });
    expect(
      await screen.findByTestId("enrollment-history-empty"),
    ).toBeInTheDocument();
    expect(axiosMock.history.get.length).toBe(0);
  });
});
