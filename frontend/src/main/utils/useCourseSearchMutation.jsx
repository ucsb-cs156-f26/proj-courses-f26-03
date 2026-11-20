import { useBackendMutation } from "main/utils/useBackend";

export function useCourseDataAvailability() {
  return useBackendMutation(
    ({ startQtr, endQtr, subjectArea }) => ({
      method: "POST",
      url: "/api/public/course-data/ensure",
      params: { startQtr, endQtr, subjectArea },
    }),
    // The page renders an alert for HTTP and network failures. The generic error toast expects
    // an HTTP response, which is absent on a network failure.
    { onError: null },
  );
}

// Availability runs independently: neither its failure nor the background load blocks results.
export function useCourseSearchMutation(
  objectToAxiosParams,
  options,
  queryKey,
) {
  const search = useBackendMutation(objectToAxiosParams, options, queryKey);
  const availability = useCourseDataAvailability();
  return {
    ...search,
    availability,
    mutate: (query) => {
      availability.mutate(objectToAxiosParams(query).params);
      search.mutate(query);
    },
  };
}
