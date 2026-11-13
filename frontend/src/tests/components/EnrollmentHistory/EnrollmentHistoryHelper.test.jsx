import {
  createEnrollmentBarChartData,
  createEnrollmentBarRows,
  createSectionBar,
  getEnrollmentBefore,
  getEnrollmentQuarters,
  getLectureSection,
  getLectureInstructors,
  getMaxEnrollment,
  getSectionBarColor,
  isLectureSection,
  isSameCourse,
  sectionBarColors,
  TOTAL_BAR_COLOR,
} from "main/components/EnrollmentHistory/EnrollmentHistoryHelper";

// Builds one enrollment data point
const point = (section, enrollment, dateCreated, yyyyq = "20262") => ({
  yyyyq,
  enrollCd: `e${section}`,
  courseId: "CMPSC   130A -1",
  section,
  enrollment,
  dateCreated,
});

const passDates = {
  pass2Begin: "2026-02-15T09:00:00",
  pass3Begin: "2026-03-01T09:00:00",
};

describe("EnrollmentHistoryHelper bar chart helpers", () => {
  test("getLectureSection and isLectureSection", () => {
    expect(getLectureSection("0101")).toBe("0100");
    expect(getLectureSection("0203")).toBe("0200");
    expect(isLectureSection("0100")).toBe(true);
    expect(isLectureSection("0101")).toBe(false);
  });

  test("getEnrollmentQuarters returns unique sorted quarters", () => {
    const data = [
      point("0100", 1, "2026-01-01", "20264"),
      point("0100", 1, "2026-01-01", "20262"),
      point("0101", 1, "2026-01-01", "20264"),
    ];
    expect(getEnrollmentQuarters(data)).toEqual(["20262", "20264"]);
    expect(getEnrollmentQuarters()).toEqual([]);
  });

  test("getEnrollmentBefore returns the latest enrollment before the cutoff", () => {
    const snapshots = [
      point("0100", 10, "2026-02-10T00:00:00"),
      point("0100", 20, "2026-02-15T09:00:00"),
      point("0100", 30, "2026-02-20T00:00:00"),
    ];
    expect(getEnrollmentBefore(snapshots, "2026-02-15T09:00:00")).toBe(10);
    expect(getEnrollmentBefore(snapshots, "2026-03-01T00:00:00")).toBe(30);
    expect(getEnrollmentBefore(snapshots, "2026-01-01T00:00:00")).toBeNull();
    expect(getEnrollmentBefore(snapshots, undefined)).toBeNull();
  });

  test("createSectionBar sorts snapshots and fills in each pass", () => {
    const snapshots = [
      point("0101", 25, "2026-03-20T00:00:00"),
      point("0101", 8, "2026-02-10T00:00:00"),
      point("0101", 15, "2026-02-20T00:00:00"),
    ];
    expect(createSectionBar(snapshots, passDates)).toEqual({
      section: "0101",
      enrollment: 25,
      pass1: 8,
      pass2: 15,
    });
    expect(createSectionBar(snapshots).pass1).toBeNull();
  });

  describe("createEnrollmentBarChartData", () => {
    test("groups discussions under their lecture, with the lecture as Total", () => {
      const data = [
        point("0100", 5, "2026-02-10T00:00:00"),
        point("0100", 22, "2026-03-20T00:00:00"),
        point("0102", 12, "2026-03-20T00:00:00"),
        point("0101", 10, "2026-03-20T00:00:00"),
        point("0100", 99, "2026-03-21T00:00:00", "20264"),
      ];
      const [onlyClass, ...others] = createEnrollmentBarChartData(
        data,
        "20262",
        passDates,
      );
      expect(others).toEqual([]);
      expect(onlyClass.lectureSection).toBe("0100");
      expect(onlyClass.discussions.map((d) => d.section)).toEqual([
        "0101",
        "0102",
      ]);
      expect(onlyClass.total).toEqual({
        section: "0100",
        enrollment: 22,
        pass1: 5,
        pass2: 5,
      });
    });

    test("splits many lectures into separate classes", () => {
      const data = [
        point("0300", 30, "2026-03-20T00:00:00"),
        point("0100", 10, "2026-03-20T00:00:00"),
        point("0200", 20, "2026-03-20T00:00:00"),
      ];
      const result = createEnrollmentBarChartData(data, "20262");
      expect(result.map((c) => c.lectureSection)).toEqual([
        "0100",
        "0200",
        "0300",
      ]);
      expect(result.map((c) => c.total.enrollment)).toEqual([10, 20, 30]);
    });

    test("leaves Total empty when the lecture has no data", () => {
      const data = [point("0101", 10, "2026-03-20T00:00:00")];
      const [onlyClass] = createEnrollmentBarChartData(data, "20262");
      expect(onlyClass.total).toBeNull();
      expect(onlyClass.discussions).toHaveLength(1);
    });

    test("returns no classes when there is no data", () => {
      expect(createEnrollmentBarChartData(undefined, "20262")).toEqual([]);
      expect(createEnrollmentBarChartData()).toEqual([]);
    });
  });

  test("getSectionBarColor goes in order, wraps, and never uses Total blue", () => {
    expect(sectionBarColors).not.toContain(TOTAL_BAR_COLOR);
    expect(getSectionBarColor(1)).toBe(sectionBarColors[1]);
    expect(getSectionBarColor(sectionBarColors.length + 2)).toBe(
      sectionBarColors[2],
    );
  });

  describe("createEnrollmentBarRows", () => {
    const bar = (section) => ({ section, enrollment: 5, pass1: 1, pass2: 3 });
    const classes = [
      {
        lectureSection: "0100",
        discussions: [bar("0101"), bar("0102")],
        total: bar("0100"),
      },
      { lectureSection: "0200", discussions: [], total: bar("0200") },
      { lectureSection: "0300", discussions: [bar("0301")], total: null },
    ];
    const rows = createEnrollmentBarRows(classes);
    const named = createEnrollmentBarRows(classes, { "0100": "CONRAD P T" });

    test("lays out discussions, Total, and a gap between classes", () => {
      expect(rows.map((r) => r.key)).toEqual([
        "0100-0101",
        "0100-0102",
        "0100-total",
        "gap-0200",
        "0200-total",
        "gap-0300",
        "0300-0301",
      ]);
      expect(rows.map((r) => r.label)).toEqual([
        "Section 1",
        "Section 2",
        "Lecture 0100",
        "",
        "Lecture 0200",
        "",
        "Section 1",
      ]);
      expect(rows[3].isSpacer).toBe(true);
    });

    test("labels the Total bar with the lecture's instructor", () => {
      expect(named[2].label).toBe("CONRAD P T");
      expect(named[4].label).toBe("Lecture 0200");
    });

    test("colors discussions by position and Total in blue", () => {
      expect(rows.map((r) => r.color)).toEqual([
        sectionBarColors[0],
        sectionBarColors[1],
        TOTAL_BAR_COLOR,
        undefined,
        TOTAL_BAR_COLOR,
        undefined,
        sectionBarColors[0],
      ]);
    });

    test("keeps each bar's counts and class", () => {
      expect(rows[0]).toMatchObject(bar("0101"));
      expect(rows[2]).toMatchObject(bar("0100"));
    });

    test("returns no rows for no classes", () => {
      expect(createEnrollmentBarRows()).toEqual([]);
    });
  });

  test("getMaxEnrollment covers bars and pass lines, ignoring gaps", () => {
    expect(
      getMaxEnrollment([
        { enrollment: 10, pass1: 12, pass2: null },
        { isSpacer: true },
        { enrollment: 11, pass1: 3, pass2: 9 },
      ]),
    ).toBe(12);
    expect(getMaxEnrollment()).toBe(0);
  });

  test("getLectureInstructors maps lecture sections to instructors", () => {
    const primary = (courseId, section, names) => ({
      courseId,
      primary: {
        section,
        instructors: names.map((instructor) => ({ instructor })),
      },
    });
    expect(
      getLectureInstructors(
        [
          primary("CMPSC   130A ", "0100", ["CONRAD P T", "WANG R K"]),
          primary("CMPSC   130A ", "0200", ["SINGH A"]),
          primary("CMPSC   130AH", "0100", ["OTHER X"]),
        ],
        "CMPSC   130A",
      ),
    ).toEqual({ "0100": "CONRAD P T, WANG R K", "0200": "SINGH A" });
    expect(getLectureInstructors()).toEqual({});
  });

  test("isSameCourse ignores the -1 suffix but not a different course", () => {
    expect(isSameCourse("CMPSC   130A -1", "CMPSC   130A ")).toBe(true);
    expect(isSameCourse("CMPSC   130AH-1", "CMPSC   130AH")).toBe(true);
    expect(isSameCourse("CHEM    184", "CHEM    184  ")).toBe(true);
    expect(isSameCourse("CMPSC   130A -1", "CMPSC   130 ")).toBe(false);
  });
});
