import { vi } from "vitest";
import { toast } from "react-toastify";

vi.mock("react-toastify", () => ({ toast: vi.fn() }));
import {
  renderHook,
  act,
  waitFor,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { useCourseSearchMutation } from "main/utils/useCourseSearchMutation";
import CourseDataWarnings from "main/components/Common/CourseDataWarnings";

const mock = new AxiosMockAdapter(axios);
const params = (query) => ({ url: "/search", params: query });
const warning =
  "Course data for MATH in quarter 20222 has not been loaded. A background update is scheduled or already running. Please check back in 5 minutes.";

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onSuccess = vi.fn();
  return {
    onSuccess,
    ...renderHook(() => useCourseSearchMutation(params, { onSuccess }, []), {
      wrapper,
    }),
  };
}

beforeEach(() => {
  mock.reset();
  vi.clearAllMocks();
});

test("availability targets the exact subject and range and exposes warnings", async () => {
  mock.onGet("/search").reply(200, []);
  mock.onPost("/api/public/course-data/ensure").reply(200, [warning]);
  const { result, onSuccess } = setup();
  const query = {
    startQtr: "20222",
    endQtr: "20223",
    subjectArea: "MATH",
    courseNumber: "8",
  };
  act(() => result.current.mutate(query));
  await waitFor(() => expect(result.current.availability.isSuccess).toBe(true));
  await waitFor(() =>
    expect(onSuccess).toHaveBeenCalledWith([], query, undefined),
  );
  expect(mock.history.post[0].params).toEqual({
    startQtr: "20222",
    endQtr: "20223",
    subjectArea: "MATH",
  });
  expect(mock.history.get[0].params).toEqual(query);
  render(<CourseDataWarnings availability={result.current.availability} />);
  expect(screen.getByRole("alert")).toHaveTextContent(warning);
});

test("results do not wait for availability; a new search clears old warnings", async () => {
  mock.onGet("/search").reply(200, ["existing course"]);
  mock.onPost("/api/public/course-data/ensure").replyOnce(200, [warning]);
  const { result, onSuccess } = setup();
  act(() => result.current.mutate({ startQtr: "20222", endQtr: "20222" }));
  await waitFor(() =>
    expect(result.current.availability.data).toEqual([warning]),
  );
  let complete;
  mock.onPost("/api/public/course-data/ensure").reply(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  act(() => result.current.mutate({ startQtr: "20223", endQtr: "20223" }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));
  expect(result.current.availability.isLoading).toBe(true);
  expect(result.current.availability.data).toBeUndefined();
  expect(mock.history.post[1].params).toEqual({
    startQtr: "20223",
    endQtr: "20223",
    subjectArea: undefined,
  });
  await act(async () => complete([200, []]));
  await waitFor(() => expect(result.current.availability.data).toEqual([]));
});

test.each(["http", "network"])(
  "%s availability failure preserves search results and shows an honest warning",
  async (failureType) => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.onGet("/search").reply(200, ["existing course"]);
    if (failureType === "network") {
      mock.onPost("/api/public/course-data/ensure").networkError();
    } else {
      mock.onPost("/api/public/course-data/ensure").reply(503);
    }
    const { result } = setup();
    act(() => result.current.mutate({ startQtr: "20222", endQtr: "20222" }));
    await waitFor(() => expect(result.current.availability.isError).toBe(true));
    await waitFor(() =>
      expect(result.current.data).toEqual(["existing course"]),
    );
    render(<CourseDataWarnings availability={result.current.availability} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not check course data availability or schedule an update.",
    );
    expect(screen.queryByText(/5 minutes/)).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    errorLog.mockRestore();
  },
);

test("loaded data and an initial pending check display no warnings", () => {
  const { rerender } = render(<CourseDataWarnings availability={{}} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  rerender(<CourseDataWarnings availability={{ data: [], isError: false }} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("submission failures from the server never claim an update is scheduled", async () => {
  const failure =
    "Course data for MATH in quarter 20222 could not be loaded or scheduled. Please try searching again later.";
  mock.onGet("/search").reply(200, []);
  mock.onPost("/api/public/course-data/ensure").reply(200, [failure]);
  const { result } = setup();
  act(() =>
    result.current.mutate({
      startQtr: "20222",
      endQtr: "20222",
      subjectArea: "MATH",
    }),
  );
  await waitFor(() => expect(result.current.availability.isSuccess).toBe(true));
  render(<CourseDataWarnings availability={result.current.availability} />);
  expect(screen.getByRole("alert")).toHaveTextContent(failure);
  expect(screen.queryByText(/5 minutes/)).not.toBeInTheDocument();
});
