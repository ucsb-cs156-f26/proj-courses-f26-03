import { Form } from "react-bootstrap";

const UsersSearchBar = () => {
  return (
    <Form.Group controlId="UsersSearch.Search">
      <Form.Label>Search</Form.Label>
      <Form.Control type="search" placeholder="Search users" />
    </Form.Group>
  );
};

export default UsersSearchBar;
