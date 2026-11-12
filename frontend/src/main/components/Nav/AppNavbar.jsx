import {
  Alert,
  Button,
  Container,
  Nav,
  Navbar,
  NavDropdown,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { hasRole } from "main/utils/currentUser";
import AppNavbarLocalhost from "main/components/Nav/AppNavbarLocalhost";
import headerImg from "../../../assets/header-logo-240.png";

// Icon shown alongside each SystemMessage, matched to its React Bootstrap Alert variant.
const systemMessageIcons = {
  danger: faExclamationCircle,
  warning: faExclamationTriangle,
  success: faCheckCircle,
  info: faInfoCircle,
};

export default function AppNavbar({
  currentUser,
  systemInfo,
  doLogout,
  currentUrl = window.location.href,
}) {
  return (
    <>
      {(currentUrl.startsWith("http://localhost:3000") ||
        currentUrl.startsWith("http://127.0.0.1:3000")) && (
        <AppNavbarLocalhost url={currentUrl} />
      )}
      <Navbar
        expand="xl"
        variant="dark"
        className="color-nav"
        sticky="top"
        data-testid="AppNavbar"
      >
        <Container>
          <img
            data-testid="AppNavbarImage"
            src={headerImg}
            alt=""
            style={{ width: 80, height: 80, marginRight: 10 }}
          />
          <Navbar.Brand as={Link} to="/">
            UCSB Courses Search
          </Navbar.Brand>

          <Navbar.Toggle />

          <>
            {/* be sure that each NavDropdown has a unique id and data-testid  */}
          </>

          <Navbar.Collapse className="justify-content-between">
            <Nav className="me-auto">
              {systemInfo?.springH2ConsoleEnabled && (
                <>
                  <Nav.Link href="/h2-console/index.html">H2Console </Nav.Link>
                </>
              )}
              {systemInfo?.showSwaggerUILink && (
                <>
                  <Nav.Link href="/swagger-ui/index.html">Swagger</Nav.Link>
                </>
              )}
            </Nav>

            <Nav className="mr-auto">
              {hasRole(currentUser, "ROLE_USER") && (
                <Nav.Link
                  as={Link}
                  to="/personalschedules/list"
                  data-testid="appnavbar-personalschedules-list"
                >
                  Personal Schedules
                </Nav.Link>
              )}
              <Nav.Link
                as={Link}
                to="/"
                data-testid="appnavbar-mainsearch-list"
              >
                Main Search
              </Nav.Link>
            </Nav>

            <Nav className="mr-auto">
              <NavDropdown
                title="Other Searches"
                id="appnavbar-course-infos-dropdown"
                data-testid="appnavbar-course-infos-dropdown"
              >
                <NavDropdown.Item
                  as={Link}
                  to="/coursedescriptions/search"
                  data-testid="appnavbar-course-descriptions-search"
                >
                  Course Descriptions
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/courseovertime/search"
                  data-testid="appnavbar-course-over-time-search"
                >
                  Course History
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/courseovertime/buildingsearch/classrooms"
                  data-testid="appnavbar-course-over-time-buildings-search"
                >
                  Course Location History
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/courseovertime/instructorsearch"
                  data-testid="appnavbar-course-over-time-instructor-search"
                >
                  Search by Instructor
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/generaleducation/search"
                  data-testid="appnavbar-ge-search"
                >
                  GE Search
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>

            <Nav className="mr-auto">
              {hasRole(currentUser, "ROLE_ADMIN") && (
                <NavDropdown
                  title="Admin"
                  id="appnavbar-admin-dropdown"
                  data-testid="appnavbar-admin-dropdown"
                >
                  <NavDropdown.Item
                    as={Link}
                    to="/admin/users"
                    data-testid="appnavbar-admin-users"
                  >
                    Users
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    as={Link}
                    to="/admin/updates"
                    data-testid="appnavbar-admin-updates"
                  >
                    Updates
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    as={Link}
                    to="/admin/personalschedule"
                    data-testid="appnavbar-admin-personalschedule"
                  >
                    Personal Schedules
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    as={Link}
                    to="/admin/loadsubjects"
                    data-testid="appnavbar-admin-loadsubjects"
                  >
                    Load Subjects
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    as={Link}
                    to="/admin/jobs"
                    data-testid="appnavbar-admin-jobs"
                  >
                    Manage Jobs
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    as={Link}
                    to="/admin/rate-limiting"
                    data-testid="appnavbar-admin-rate-limiting"
                  >
                    Rate Limiting
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    as={Link}
                    to="/developer"
                    data-testid="appnavbar-developer"
                  >
                    Developer Info
                  </NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>

            <Nav className="ml-auto">
              <Nav.Link
                as={Link}
                to="/downloads"
                data-testid="appnavbar-downloads"
              >
                Downloads
              </Nav.Link>
              {currentUser && currentUser.loggedIn ? (
                <>
                  <Navbar.Text className="me-3" as={Link} to="/profile">
                    Welcome, {currentUser.root.user.email}
                  </Navbar.Text>
                  <Button onClick={doLogout}>Log Out</Button>
                </>
              ) : (
                <Button href="/oauth2/authorization/google">Log In</Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      {systemInfo?.systemMessages?.map((systemMessage, index) => (
        <Alert
          key={index}
          variant={systemMessage.variant}
          className="mb-0 rounded-0 text-center"
          data-testid={`AppNavbar-systemMessage-${index}`}
        >
          <FontAwesomeIcon
            icon={systemMessageIcons[systemMessage.variant]}
            className="me-2"
          />
          {systemMessage.message}
        </Alert>
      ))}
    </>
  );
}
