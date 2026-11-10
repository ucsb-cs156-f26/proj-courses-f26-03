import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import userEvent from "@testing-library/user-event";

import EnrollmentHistoryPage from "main/pages/EnrollmentHistory/EnrollmentHistoryPage";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import primaryFixtures from "fixtures/primaryFixtures";
import { allTheSubjects } from "fixtures/subjectFixtures";
import { enrollmentDataPointFixtures } from "fixtures/enrollmentDataPointFixtures";

describe("EnrollmentHistoryPage tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
    axiosMock.onGet("/api/UCSBSubjects/all").reply(200, allTheSubjects);
  });

  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EnrollmentHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  const submitSearch = async () => {
    await userEvent.selectOptions(
      screen.getByLabelText("Start Quarter"),
      "20222",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("End Quarter"),
      "20222",
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("CourseOverTimeSearch.Subject-option-MATH"),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Subject Area"),
      "MATH",
    );
    await userEvent.type(screen.getByLabelText("Course Number"), "2A");
    await userEvent.click(screen.getByText("Submit"));
  };

  test("renders the heading and no messages before searching", () => {
    renderPage();
    expect(screen.getByText("Enrollment History")).toBeInTheDocument();
    expect(screen.queryByText("Loading courses...")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No courses were found with the specified criteria."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("EnrollmentHistorySectionsTable"),
    ).not.toBeInTheDocument();
  });

  test("shows a loading message and sends the search params", async () => {
    axiosMock.onGet("/api/public/courseovertime/search").reply(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve([200, primaryFixtures.f24_math_lowerDiv]),
            100,
          );
        }),
    );
    renderPage();
    await submitSearch();

    expect(await screen.findByText("Loading courses...")).toBeInTheDocument();
    expect(
      screen.queryByText("No courses were found with the specified criteria."),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByTestId("EnrollmentHistorySectionsTable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading courses...")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No courses were found with the specified criteria."),
    ).not.toBeInTheDocument();

    const searchRequest = axiosMock.history.get.find(
      (r) => r.url === "/api/public/courseovertime/search",
    );
    expect(searchRequest.params).toEqual({
      startQtr: expect.any(String),
      endQtr: "20222",
      subjectArea: "MATH",
      courseNumber: "2A",
    });
  });

  test("shows a no courses message for an empty search", async () => {
    axiosMock.onGet("/api/public/courseovertime/search").reply(200, []);
    renderPage();
    await submitSearch();
    expect(
      await screen.findByText(
        "No courses were found with the specified criteria.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("EnrollmentHistorySectionsTable"),
    ).not.toBeInTheDocument();
  });

  test("shows the enrollment graph below the table when a row's button is clicked", async () => {
    axiosMock
      .onGet("/api/public/courseovertime/search")
      .reply(200, primaryFixtures.f24_math_lowerDiv);
    axiosMock.onGet("/api/enrollment/search").reply(
      200,
      enrollmentDataPointFixtures.cmpsc130aLectureOverTime.map((d) => ({
        ...d,
        enrollCd: "30247",
      })),
    );
    renderPage();
    await submitSearch();

    expect(
      screen.queryByTestId("enrollment-history-graph"),
    ).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId(
        "EnrollmentHistorySectionsTable-row-0-show-enrollment-history",
      ),
    );

    expect(
      await screen.findByTestId("enrollment-history-graph"),
    ).toBeInTheDocument();
    expect(
      axiosMock.history.get.find((r) => r.url === "/api/enrollment/search")
        .params,
    ).toEqual({
      startQtr: "20244",
      endQtr: "20244",
      subjectArea: "MATH",
      courseNumber: "2A",
      enrollCd: "30247",
    });
  });

  test("clears the graph when a new search is made", async () => {
    axiosMock
      .onGet("/api/public/courseovertime/search")
      .reply(200, primaryFixtures.f24_math_lowerDiv);
    axiosMock.onGet("/api/enrollment/search").reply(200, []);
    renderPage();
    await submitSearch();
    await userEvent.click(
      await screen.findByTestId(
        "EnrollmentHistorySectionsTable-row-0-show-enrollment-history",
      ),
    );
    expect(
      await screen.findByTestId("enrollment-history-empty"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText("Submit"));
    await waitFor(() =>
      expect(
        screen.queryByTestId("enrollment-history-empty"),
      ).not.toBeInTheDocument(),
    );
  });
});
