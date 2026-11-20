import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";

import CSVDownloadsPage from "main/pages/CSV/CSVDownloadsPage";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { allTheSubjects } from "fixtures/subjectFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

describe("CSVDownloadsPage tests", () => {
  let axiosMock;

  beforeEach(() => {
    axiosMock = new AxiosMockAdapter(axios);
    const localStorageStore = {};
    const localStorageMock = {
      getItem: (key) => localStorageStore[key] || null,
      setItem: (key, value) => {
        localStorageStore[key] = value.toString();
      },
      removeItem: (key) => {
        delete localStorageStore[key];
      },
      clear: () => {
        Object.keys(localStorageStore).forEach((key) => {
          delete localStorageStore[key];
        });
      },
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    localStorage.setItem("CSVDownloads.Quarter", "20241");
    localStorage.setItem("CSVDownloads.SubjectQuarter", "20241");
    localStorage.setItem("CSVDownloads.Subject", "ANTH");
    localStorage.setItem("CSVDownloads.Level", "U");
    axiosMock.reset();
    axiosMock.onPost("/api/public/course-data/ensure").reply(200, []);
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
    axiosMock.onGet("/api/systemInfo").reply(200, {
      ...systemInfoFixtures.showingNeither,
      startQtrYYYYQ: "20241",
      endQtrYYYYQ: "20242",
    });
    axiosMock.onGet("/api/UCSBSubjects/all").reply(200, allTheSubjects);
  });

  afterEach(() => {
    axiosMock.restore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const renderPage = (
    browserLocation = window.location,
    queryClient = new QueryClient(),
  ) => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CSVDownloadsPage browserLocation={browserLocation} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  const mockLocationAssign = () => {
    const assignMock = vi.fn();
    return {
      assignMock,
      browserLocation: { assign: assignMock },
    };
  };

  const enrollmentEndpoint = "/api/enrollment/csv/quarter";
  const enrollmentCsvHeaders = { "Content-Type": "text/csv ; charset=UTF-8" };
  const enrollmentError =
    "Unable to download enrollment CSV. Please try again.";

  const mockEnrollmentDownload = () => {
    const objectUrl = "blob:enrollment-csv";
    const createObjectURL = vi.fn().mockReturnValue(objectUrl);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "URL",
      Object.assign(class extends URL {}, {
        createObjectURL,
        revokeObjectURL,
      }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    return { objectUrl, createObjectURL, revokeObjectURL, click };
  };

  const openEnrollmentForm = (queryClient) => {
    renderPage(undefined, queryClient);
    fireEvent.click(
      screen.getByRole("button", { name: "Enrollment Downloads" }),
    );

    return within(
      screen.getByTestId("CSVDownloads.EnrollmentQuarter").closest("form"),
    );
  };

  const courseQuarterIds = [
    "CSVDownloads.Quarter",
    "CSVDownloads.SubjectQuarter",
  ];
  const getCourseForm = (quarterId) =>
    screen.getByTestId(quarterId).closest("form");

  test.each(courseQuarterIds)(
    "download form %s waits for availability before navigating",
    async (quarterId) => {
      let finishAvailability;
      axiosMock.onPost("/api/public/course-data/ensure").reply(
        () =>
          new Promise((resolve) => {
            finishAvailability = resolve;
          }),
      );
      const { assignMock, browserLocation } = mockLocationAssign();
      renderPage(browserLocation);
      const buttons = courseQuarterIds.map((id) =>
        within(getCourseForm(id)).getByText("Download CSV", {
          selector: "button",
        }),
      );
      fireEvent.submit(getCourseForm(quarterId));
      await waitFor(() => expect(finishAvailability).toBeTypeOf("function"));
      expect(assignMock).not.toHaveBeenCalled();
      await waitFor(() =>
        buttons.forEach((button) => expect(button).toBeDisabled()),
      );
      finishAvailability([200, []]);
      await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        buttons.forEach((button) => expect(button).toBeEnabled()),
      );
    },
  );

  test.each(courseQuarterIds)(
    "download form %s still downloads existing data on scheduling failure",
    async (quarterId) => {
      axiosMock.onPost("/api/public/course-data/ensure").networkError();
      const { assignMock, browserLocation } = mockLocationAssign();
      renderPage(browserLocation);
      fireEvent.submit(getCourseForm(quarterId));
      await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not check course data availability or schedule an update",
      );
      expect(
        screen.queryByText(/scheduled or already running/),
      ).not.toBeInTheDocument();
    },
  );

  test("renders correctly", async () => {
    renderPage();

    expect(await screen.findByText("CSV Downloads")).toBeInTheDocument();
  });

  test("shows a quarter selector in the Enrollment Downloads accordion", () => {
    renderPage();

    const accordionButton = screen.getByRole("button", {
      name: "Enrollment Downloads",
    });
    fireEvent.click(accordionButton);

    expect(accordionButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("CSVDownloads.EnrollmentQuarter")).toBeVisible();
  });

  test("downloads an enrollment CSV Blob for the selected quarter and cleans up", async () => {
    const csv = new Blob(["yyyyq,enrollment\n20242,96\n"], {
      type: "text/csv",
    });
    axiosMock.onGet(enrollmentEndpoint).reply(200, csv, enrollmentCsvHeaders);

    const { objectUrl, createObjectURL, revokeObjectURL, click } =
      mockEnrollmentDownload();
    const enrollmentForm = openEnrollmentForm();
    await enrollmentForm.findByRole("option", { name: "S24" });
    fireEvent.change(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
      {
        target: { value: "20242" },
      },
    );
    fireEvent.click(
      enrollmentForm.getByRole("button", { name: "Download CSV" }),
    );

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));

    const requests = axiosMock.history.get.filter(
      ({ url }) => url === enrollmentEndpoint,
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].params).toEqual({ yyyyq: "20242" });
    expect(requests[0].responseType).toBe("blob");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toBe(csv);

    const link = click.mock.contexts[0];
    expect(link).toHaveAttribute("href", objectUrl);
    expect(link).toHaveAttribute("download", "enrollment_20242.csv");
    expect(link).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(objectUrl);
  });

  test("shows an enrollment download error after an HTTP 500", async () => {
    axiosMock.onGet(enrollmentEndpoint).reply(500);
    const { createObjectURL, click } = mockEnrollmentDownload();
    const enrollmentForm = openEnrollmentForm();
    const button = enrollmentForm.getByRole("button", { name: "Download CSV" });

    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(enrollmentError);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(button).toHaveAccessibleName("Download CSV");
    expect(button).toBeEnabled();
  });

  test.each([
    [
      "HTML",
      "<html>Downloads</html>",
      { "Content-Type": "text/html; charset=UTF-8" },
    ],
    [
      "JSON",
      '{"message":"Unexpected response"}',
      { "Content-Type": "application/json" },
    ],
    ["untyped", "Unexpected response", {}],
  ])(
    "rejects an HTTP 200 %s response instead of downloading it",
    async (_, body, headers) => {
      axiosMock.onGet(enrollmentEndpoint).reply(200, new Blob([body]), headers);
      const { createObjectURL, click } = mockEnrollmentDownload();
      const enrollmentForm = openEnrollmentForm();
      const button = enrollmentForm.getByRole("button", {
        name: "Download CSV",
      });

      fireEvent.click(button);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        enrollmentError,
      );
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
      expect(button).toHaveAccessibleName("Download CSV");
      expect(button).toBeEnabled();
    },
  );

  test("shows an enrollment download error and allows retry after a network failure", async () => {
    axiosMock.onGet(enrollmentEndpoint).networkError();
    const { createObjectURL, click } = mockEnrollmentDownload();
    const enrollmentForm = openEnrollmentForm();
    const button = enrollmentForm.getByRole("button", { name: "Download CSV" });

    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(enrollmentError);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(button).toHaveAccessibleName("Download CSV");
    expect(button).toBeEnabled();
  });

  test("disables enrollment download and prevents repeat requests while pending", async () => {
    const { promise, resolve } = Promise.withResolvers();
    const reply = vi.fn(() => promise);
    axiosMock.onGet(enrollmentEndpoint).reply(reply);
    const { click } = mockEnrollmentDownload();
    const enrollmentForm = openEnrollmentForm();
    const button = enrollmentForm.getByRole("button", { name: "Download CSV" });

    fireEvent.click(button);
    expect(button).toHaveAccessibleName("Downloading...");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(reply).toHaveBeenCalledTimes(1);

    resolve([
      200,
      new Blob(["yyyyq,enrollment\n20241,96\n"], { type: "text/csv" }),
      enrollmentCsvHeaders,
    ]);

    expect(
      await enrollmentForm.findByRole("button", { name: "Download CSV" }),
    ).toBeEnabled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      scenario: "an HTTP 500",
      response: [500],
      message: enrollmentError,
    },
    {
      scenario: "an empty CSV",
      response: [200, new Blob([], { type: "text/csv" }), enrollmentCsvHeaders],
      message: "No enrollment data is available for the selected quarter.",
    },
  ])(
    "downloads the CSV on retry after $scenario",
    async ({ response, message }) => {
      const csv = new Blob(["yyyyq,enrollment\n20241,96\n"], {
        type: "text/csv",
      });
      axiosMock
        .onGet(enrollmentEndpoint)
        .replyOnce(...response)
        .onGet(enrollmentEndpoint)
        .reply(200, csv, enrollmentCsvHeaders);
      const { createObjectURL, click } = mockEnrollmentDownload();
      const enrollmentForm = openEnrollmentForm();
      const button = enrollmentForm.getByRole("button", {
        name: "Download CSV",
      });

      fireEvent.click(button);
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(button).toBeEnabled();
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();

      fireEvent.click(button);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      expect(
        await enrollmentForm.findByRole("button", { name: "Download CSV" }),
      ).toBeEnabled();
      expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(csv);
      expect(click).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  const deferSystemInfo = () => {
    const { promise, resolve } = Promise.withResolvers();
    axiosMock.onGet("/api/systemInfo").reply(() => promise);

    return (startQtrYYYYQ, endQtrYYYYQ) => {
      resolve([
        200,
        { ...systemInfoFixtures.showingNeither, startQtrYYYYQ, endQtrYYYYQ },
      ]);
    };
  };

  const expectDownloadForDisplayedQuarter = async (enrollmentForm) => {
    const { click } = mockEnrollmentDownload();
    axiosMock
      .onGet(enrollmentEndpoint)
      .reply(200, new Blob(["yyyyq,enrollment\n"], { type: "text/csv" }), {
        "Content-Type": "text/csv",
      });
    const displayedQuarter = enrollmentForm.getByRole("combobox", {
      name: "Quarter",
    }).value;

    fireEvent.click(
      enrollmentForm.getByRole("button", { name: "Download CSV" }),
    );

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    const requests = axiosMock.history.get.filter(
      ({ url }) => url === enrollmentEndpoint,
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].params).toEqual({ yyyyq: displayedQuarter });
  };

  test("downloads the default enrollment quarter without a manual selection", async () => {
    const enrollmentForm = openEnrollmentForm();

    await enrollmentForm.findByRole("option", { name: "W24" });
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20241");
    await expectDownloadForDisplayedQuarter(enrollmentForm);
  });

  test("synchronizes the default enrollment quarter when system info replaces the placeholders", async () => {
    const resolveSystemInfo = deferSystemInfo();
    const enrollmentForm = openEnrollmentForm();
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20221");

    resolveSystemInfo("20241", "20242");

    await enrollmentForm.findByRole("option", { name: "W24" });
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20241");
    await expectDownloadForDisplayedQuarter(enrollmentForm);
  });

  test("preserves a manually selected enrollment quarter when it remains available", async () => {
    const resolveSystemInfo = deferSystemInfo();
    const enrollmentForm = openEnrollmentForm();
    fireEvent.change(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
      {
        target: { value: "20222" },
      },
    );

    resolveSystemInfo("20221", "20224");

    await enrollmentForm.findByRole("option", { name: "F22" });
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20222");
    await expectDownloadForDisplayedQuarter(enrollmentForm);
  });

  test("downloads a valid replacement when the selected enrollment quarter becomes unavailable", async () => {
    const resolveSystemInfo = deferSystemInfo();
    const enrollmentForm = openEnrollmentForm();
    const quarterDropdown = enrollmentForm.getByRole("combobox", {
      name: "Quarter",
    });
    fireEvent.change(quarterDropdown, { target: { value: "20222" } });
    expect(quarterDropdown).toHaveValue("20222");

    resolveSystemInfo("20231", "20232");

    await enrollmentForm.findByRole("option", { name: "W23" });
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20231");
    await expectDownloadForDisplayedQuarter(enrollmentForm);
  });

  test("keeps the replacement enrollment quarter when the previous choice becomes available again", async () => {
    const queryClient = new QueryClient();
    const enrollmentForm = openEnrollmentForm(queryClient);
    await enrollmentForm.findByRole("option", { name: "S24" });
    fireEvent.change(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
      {
        target: { value: "20242" },
      },
    );

    act(() => {
      queryClient.setQueryData("systemInfo", {
        ...systemInfoFixtures.showingNeither,
        startQtrYYYYQ: "20244",
        endQtrYYYYQ: "20251",
      });
    });
    await enrollmentForm.findByRole("option", { name: "F24" });
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20244");

    act(() => {
      queryClient.setQueryData("systemInfo", {
        ...systemInfoFixtures.showingNeither,
        startQtrYYYYQ: "20241",
        endQtrYYYYQ: "20251",
      });
    });
    await enrollmentForm.findByRole("option", { name: "S24" });
    expect(
      enrollmentForm.getByRole("combobox", { name: "Quarter" }),
    ).toHaveValue("20244");
    await expectDownloadForDisplayedQuarter(enrollmentForm);
  });

  test("uses dropdowns for quarters, subject area, and course level", async () => {
    renderPage();

    const byQuarterForm = within(
      screen.getByTestId("CSVDownloads.Quarter").closest("form"),
    );
    const bySubjectForm = within(
      screen.getByTestId("CSVDownloads.SubjectQuarter").closest("form"),
    );
    expect(byQuarterForm.getByLabelText("Quarter")).toHaveAttribute(
      "id",
      "CSVDownloads.Quarter",
    );
    expect(bySubjectForm.getByLabelText("Quarter")).toHaveAttribute(
      "id",
      "CSVDownloads.SubjectQuarter",
    );
    const subjectAreaDropdown = bySubjectForm.getByLabelText("Subject Area");
    const levelDropdown = bySubjectForm.getByLabelText("Course Level");
    expect(subjectAreaDropdown).toBeInTheDocument();
    expect(levelDropdown).toBeInTheDocument();
    expect(bySubjectForm.getByLabelText("Omit sections")).toBeChecked();
    expect(
      bySubjectForm.getByLabelText(
        "Only include courses with times or locations",
      ),
    ).toBeChecked();

    expect(screen.getByTestId("CSVDownloads.Level-option-0")).toHaveValue("U");
    expect(screen.getByTestId("CSVDownloads.Level-option-0")).toHaveTextContent(
      "Undergraduate",
    );
    expect(screen.getByTestId("CSVDownloads.Level-option-1")).toHaveValue("G");
    expect(screen.getByTestId("CSVDownloads.Level-option-1")).toHaveTextContent(
      "Graduate",
    );
    expect(screen.getByTestId("CSVDownloads.Level-option-2")).toHaveValue("A");
    expect(screen.getByTestId("CSVDownloads.Level-option-2")).toHaveTextContent(
      "All",
    );
    expect(levelDropdown).toHaveValue("U");

    await waitFor(() =>
      expect(
        screen.getByTestId("CSVDownloads.Subject-option-CMPSC"),
      ).toBeInTheDocument(),
    );
    expect(subjectAreaDropdown).toHaveValue("ANTH");
    expect(screen.getByTestId("CSVDownloads.Subject-option-ANTH")).toHaveValue(
      "ANTH",
    );
    expect(
      screen.getByTestId("CSVDownloads.Subject-option-ANTH"),
    ).toHaveTextContent("ANTH - Anthropology");
  });

  test("submitting by-quarter form downloads selected quarter", async () => {
    const warning =
      "Course data for CMPSC in quarter 20242 has not been loaded. A background update is scheduled or already running. Please check back in 5 minutes.";
    axiosMock.onPost("/api/public/course-data/ensure").reply(200, [warning]);
    const { assignMock, browserLocation } = mockLocationAssign();
    renderPage(browserLocation);

    const quarterDropdown = await screen.findByTestId("CSVDownloads.Quarter");
    const byQuarterForm = quarterDropdown.closest("form");

    fireEvent.change(quarterDropdown, { target: { value: "20242" } });
    fireEvent.submit(byQuarterForm);

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
    expect(assignMock).toHaveBeenCalledWith(
      "/api/courses/csv/quarter?yyyyq=20242",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(warning);
    expect(axiosMock.history.post[0].params).toEqual({
      startQtr: "20242",
      endQtr: "20242",
      subjectArea: undefined,
    });
  });

  test("submitting by-quarter-and-subject form includes all endpoint parameters", async () => {
    const warning =
      "Course data for CMPSC in quarter 20242 has not been loaded. A background update is scheduled or already running. Please check back in 5 minutes.";
    axiosMock.onPost("/api/public/course-data/ensure").reply(200, [warning]);
    const { assignMock, browserLocation } = mockLocationAssign();
    renderPage(browserLocation);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Download all UCSB classes by Quarter and Subject Area",
      }),
    );

    const quarterDropdown = screen.getByTestId("CSVDownloads.SubjectQuarter");
    const byQuarterAndSubjectForm = quarterDropdown.closest("form");
    const subjectAreaDropdown = screen.getByLabelText("Subject Area");
    const levelDropdown = screen.getByLabelText("Course Level");
    const omitSectionsCheckbox = screen.getByLabelText("Omit sections");
    const withTimeLocationsCheckbox = screen.getByLabelText(
      "Only include courses with times or locations",
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("CSVDownloads.Subject-option-CMPSC"),
      ).toBeInTheDocument(),
    );

    fireEvent.change(quarterDropdown, { target: { value: "20242" } });
    fireEvent.change(subjectAreaDropdown, { target: { value: "CMPSC" } });
    fireEvent.change(levelDropdown, { target: { value: "G" } });
    fireEvent.click(omitSectionsCheckbox);
    fireEvent.click(withTimeLocationsCheckbox);
    fireEvent.submit(byQuarterAndSubjectForm);

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
    expect(assignMock).toHaveBeenCalledWith(
      "/api/courses/csv/byQuarterAndSubjectArea?yyyyq=20242&subjectArea=CMPSC&level=G&omitSections=false&withTimeLocations=false",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(warning);
    expect(axiosMock.history.post[0].params).toEqual({
      startQtr: "20242",
      endQtr: "20242",
      subjectArea: "CMPSC",
    });
  });

  test("submitting by-quarter-and-subject form includes default parameters", async () => {
    const { assignMock, browserLocation } = mockLocationAssign();
    renderPage(browserLocation);

    await waitFor(() =>
      expect(
        screen.getByTestId("CSVDownloads.Subject-option-ANTH"),
      ).toBeInTheDocument(),
    );

    fireEvent.submit(
      screen.getByTestId("CSVDownloads.SubjectQuarter").closest("form"),
    );

    await waitFor(() => expect(assignMock).toHaveBeenCalledTimes(1));
    expect(assignMock).toHaveBeenCalledWith(
      "/api/courses/csv/byQuarterAndSubjectArea?yyyyq=20221&subjectArea=ANTH&level=U&omitSections=true&withTimeLocations=true",
    );
  });

  test("uses default quarter range when systemInfo has no quarter data", async () => {
    axiosMock.onGet("/api/systemInfo").reply(200, {});
    renderPage();
    expect(await screen.findByText("CSV Downloads")).toBeInTheDocument();
    expect(screen.getByTestId("CSVDownloads.Quarter")).toBeInTheDocument();
  });
});
