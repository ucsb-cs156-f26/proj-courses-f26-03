import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";

import AppNavbar from "main/components/Nav/AppNavbar";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

describe("AppNavbar tests", () => {
  const queryClient = new QueryClient();

  test("renders correctly for regular logged in user", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar currentUser={currentUser} doLogin={doLogin} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Welcome, pconrad.cis@gmail.com"),
    ).toBeInTheDocument();

    expect(screen.getByTestId("appnavbar-downloads")).toBeInTheDocument();
    expect(screen.getByTestId("appnavbar-downloads")).toHaveAttribute(
      "href",
      "/downloads",
    );
    expect(screen.getByTestId("appnavbar-downloads")).toHaveTextContent(
      "Downloads",
    );
    expect(
      screen.getByTestId("appnavbar-personalschedules-list"),
    ).toHaveAttribute("href", "/personalschedules/list");
    expect(screen.getByTestId("appnavbar-mainsearch-list")).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("renders correctly for admin user", async () => {
    const currentUser = currentUserFixtures.adminUser;
    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar currentUser={currentUser} doLogin={doLogin} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Welcome, phtcon@ucsb.edu"),
    ).toBeInTheDocument();
    const adminMenu = screen.getByTestId("appnavbar-admin-dropdown");

    expect(adminMenu).toBeInTheDocument();

    const aElement = adminMenu.querySelector("a");
    expect(aElement).toBeInTheDocument();
    aElement?.click();

    expect(
      await screen.findByTestId(/appnavbar-admin-users/),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("appnavbar-admin-loadsubjects"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(/appnavbar-admin-personalschedule/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("appnavbar-admin-jobs")).toBeInTheDocument();
    expect(
      screen.getByTestId("appnavbar-admin-rate-limiting"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("appnavbar-developer")).toBeInTheDocument();
    expect(screen.getByTestId("appnavbar-admin-users")).toHaveAttribute(
      "href",
      "/admin/users",
    );
    expect(screen.getByTestId("appnavbar-admin-updates")).toHaveAttribute(
      "href",
      "/admin/updates",
    );
    expect(
      screen.getByTestId("appnavbar-admin-personalschedule"),
    ).toHaveAttribute("href", "/admin/personalschedule");
    expect(screen.getByTestId("appnavbar-admin-loadsubjects")).toHaveAttribute(
      "href",
      "/admin/loadsubjects",
    );
    expect(screen.getByTestId("appnavbar-admin-jobs")).toHaveAttribute(
      "href",
      "/admin/jobs",
    );
    expect(screen.getByTestId("appnavbar-admin-rate-limiting")).toHaveAttribute(
      "href",
      "/admin/rate-limiting",
    );
    expect(screen.getByTestId("appnavbar-developer")).toHaveAttribute(
      "href",
      "/developer",
    );
  });

  test("renders H2Console and Swagger links correctly", async () => {
    const currentUser = currentUserFixtures.adminUser;
    const systemInfo = systemInfoFixtures.showingBoth;

    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("H2Console")).toBeInTheDocument();
    expect(screen.getByText("Swagger")).toBeInTheDocument();
  });

  test("renders image correctly", async () => {
    const currentUser = currentUserFixtures.adminUser;
    const systemInfo = systemInfoFixtures.showingBoth;

    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("AppNavbarImage")).toHaveAttribute(
      "style",
      "width: 80px; height: 80px; margin-right: 10px;",
    );
  });

  test("renders the AppNavbarLocalhost when on http://localhost:3000", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;
    const doLogin = vi.fn();

    delete window.location;
    window.location = new URL("http://localhost:3000");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("AppNavbarLocalhost")).toBeInTheDocument();
  });

  test("renders the AppNavbarLocalhost when on http://127.0.0.1:3000", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;
    const doLogin = vi.fn();

    delete window.location;
    window.location = new URL("http://127.0.0.1:3000");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("AppNavbarLocalhost")).toBeInTheDocument();
  });

  test("does NOT render the AppNavbarLocalhost when on localhost:8080", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;
    const doLogin = vi.fn();

    delete window.location;
    window.location = new URL("http://localhost:8080");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("AppNavbar")).toBeInTheDocument();
    expect(screen.queryByTestId(/AppNavbarLocalhost/i)).toBeNull();
  });

  test("renders Personal Schedules and Courses links correctly for regular logged in user", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;

    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Personal Schedules")).toBeInTheDocument();
    expect(
      await screen.findByTestId("appnavbar-personalschedules-list"),
    ).toBeInTheDocument();

    expect(await screen.findByText("Main Search")).toBeInTheDocument();
    expect(
      await screen.findByTestId("appnavbar-mainsearch-list"),
    ).toBeInTheDocument();
  });

  test("renders the Course Description menu correctly", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;

    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByTestId("appnavbar-course-infos-dropdown"),
    ).toBeInTheDocument();
    const dropdown = screen.getByTestId("appnavbar-course-infos-dropdown");
    const aElement = dropdown.querySelector("a");
    expect(aElement).toBeInTheDocument();
    aElement?.click();

    expect(
      await screen.findByTestId("appnavbar-course-descriptions-search"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("appnavbar-course-descriptions-search"),
    ).toHaveAttribute("href", "/coursedescriptions/search");
  });

  test("renders the Course History/Course Over Time menu correctly", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;

    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByTestId("appnavbar-course-infos-dropdown"),
    ).toBeInTheDocument();
    const dropdown = screen.getByTestId("appnavbar-course-infos-dropdown");
    const aElement = dropdown.querySelector("a");
    expect(aElement).toBeInTheDocument();
    aElement?.click();

    expect(
      await screen.findByTestId("appnavbar-course-over-time-search"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("appnavbar-course-over-time-search"),
    ).toHaveAttribute("href", "/courseovertime/search");
  });

  test("renders the Instructor Course Over Time menu correctly", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;

    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByTestId("appnavbar-course-infos-dropdown"),
    ).toBeInTheDocument();
    const dropdown = screen.getByTestId("appnavbar-course-infos-dropdown");
    const aElement = dropdown.querySelector("a");
    expect(aElement).toBeInTheDocument();
    aElement?.click();

    expect(
      await screen.findByTestId("appnavbar-course-over-time-instructor-search"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("appnavbar-course-over-time-instructor-search"),
    ).toHaveAttribute("href", "/courseovertime/instructorsearch");

    expect(
      screen.getByTestId("appnavbar-course-over-time-buildings-search"),
    ).toHaveAttribute("href", "/courseovertime/buildingsearch/classrooms");

    expect(screen.getByTestId("appnavbar-ge-search")).toHaveAttribute(
      "href",
      "/generaleducation/search",
    );
  });

  test("renders no system message banners when systemInfo.systemMessages is empty or absent", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.showingBoth;
    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Welcome, pconrad.cis@gmail.com"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("AppNavbar-systemMessage-0"),
    ).not.toBeInTheDocument();
  });

  test("renders a banner with the right variant, icon, and message for each system message", async () => {
    const currentUser = currentUserFixtures.userOnly;
    const systemInfo = systemInfoFixtures.withSystemMessages;
    const doLogin = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppNavbar
            currentUser={currentUser}
            systemInfo={systemInfo}
            doLogin={doLogin}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    for (const [index, systemMessage] of systemInfo.systemMessages.entries()) {
      const banner = await screen.findByTestId(
        `AppNavbar-systemMessage-${index}`,
      );
      expect(banner).toHaveTextContent(systemMessage.message);
      expect(banner.className).toContain(`alert-${systemMessage.variant}`);
      expect(banner.querySelector("svg")).toBeInTheDocument();
    }
  });
});
