import { stripLectureSuffix } from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

describe("stripLectureSuffix tests", () => {
  test("removes a lecture suffix preceded by a space", () => {
    expect(stripLectureSuffix("CMPSC   130A -1")).toBe("CMPSC   130A");
  });

  test("removes a lecture suffix with no space before it", () => {
    expect(stripLectureSuffix("CMPSC   130A-1")).toBe("CMPSC   130A");
  });

  test("removes a lecture suffix preceded by several spaces", () => {
    expect(stripLectureSuffix("CMPSC   130A  -1")).toBe("CMPSC   130A");
  });

  test("removes a multi-digit lecture suffix", () => {
    expect(stripLectureSuffix("CMPSC   130A -12")).toBe("CMPSC   130A");
  });

  test("removes a lecture suffix followed by whitespace", () => {
    expect(stripLectureSuffix("CMPSC   130A -1 ")).toBe("CMPSC   130A");
  });

  test("leaves a course id without a lecture suffix unchanged", () => {
    expect(stripLectureSuffix("CMPSC   130A ")).toBe("CMPSC   130A ");
  });

  test("only removes the suffix at the end of the course id", () => {
    expect(stripLectureSuffix("CMPSC   130A -1B")).toBe("CMPSC   130A -1B");
  });

  test("returns undefined when there is no course id", () => {
    expect(stripLectureSuffix(undefined)).toBeUndefined();
  });
});
