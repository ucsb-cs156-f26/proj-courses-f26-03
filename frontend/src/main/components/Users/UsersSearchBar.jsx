import { useState } from "react";
import { Form } from "react-bootstrap";

export const MAX_SEARCH_LENGTH = 255;

const UsersSearchBar = ({ updateSearch }) => {
  const [value, setValue] = useState("");

  return (
    <Form.Group controlId="UsersSearch.Search">
      <Form.Label>Search</Form.Label>
      <Form.Control
        type="search"
        placeholder="Search users"
        maxLength={MAX_SEARCH_LENGTH}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          updateSearch?.(event.target.value);
        }}
      />
      {value.length >= MAX_SEARCH_LENGTH && (
        <Form.Text
          className="text-danger"
          data-testid="UsersSearch.Search-notice"
        >
          Search is limited to {MAX_SEARCH_LENGTH} characters.
        </Form.Text>
      )}
    </Form.Group>
  );
};

export default UsersSearchBar;
