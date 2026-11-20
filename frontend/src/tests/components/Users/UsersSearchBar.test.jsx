import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersSearchBar from "main/components/Users/UsersSearchBar";

describe("UsersSearchBar tests", () => {
  test("renders a labeled, empty search input", () => {
    render(<UsersSearchBar />);

    const input = screen.getByLabelText("Search");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Search users");
    expect(input).toHaveAttribute("id", "UsersSearch.Search");
  });

  test("accepts typed input", async () => {
    render(<UsersSearchBar />);

    const input = screen.getByLabelText("Search");
    await userEvent.type(input, "alice");

    expect(input).toHaveValue("alice");
  });
});
