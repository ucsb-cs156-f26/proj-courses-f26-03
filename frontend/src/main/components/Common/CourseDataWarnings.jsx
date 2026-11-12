import Alert from "react-bootstrap/Alert";

export default function CourseDataWarnings({ availability }) {
  return (
    <>
      {availability.isError && (
        <Alert variant="warning">
          Could not check course data availability or schedule an update. Please
          try searching again later.
        </Alert>
      )}
      {availability.data?.map((warning) => (
        <Alert key={warning} variant="warning">
          {warning}
        </Alert>
      ))}
    </>
  );
}
