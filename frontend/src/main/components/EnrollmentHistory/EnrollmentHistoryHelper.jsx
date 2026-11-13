// e.g. "0101" -> "0100"
export const getLectureSection = (section) => `${section.slice(0, 2)}00`;

export const isLectureSection = (section) => section.endsWith("00");

export const getEnrollmentQuarters = (data = []) =>
  [...new Set(data.map((dataPoint) => dataPoint.yyyyq))].sort();

export const getEnrollmentBefore = (snapshots, cutoff) => {
  const before = snapshots.filter((snapshot) => snapshot.dateCreated < cutoff);
  return before.length > 0 ? before[before.length - 1].enrollment : null;
};

// A section's latest enrollment plus its enrollment at the end of each pass.
export const createSectionBar = (snapshots, passDates = {}) => {
  const sorted = [...snapshots].sort((a, b) =>
    a.dateCreated.localeCompare(b.dateCreated),
  );
  const latest = sorted[sorted.length - 1];
  return {
    section: latest.section,
    enrollment: latest.enrollment,
    pass1: getEnrollmentBefore(sorted, passDates.pass2Begin),
    pass2: getEnrollmentBefore(sorted, passDates.pass3Begin),
  };
};

// Groups one quarter's data into classes, one per lecture. The Total bar is
// the lecture section's own enrollment, so no student is counted twice.
export const createEnrollmentBarChartData = (
  data = [],
  yyyyq,
  passDates = {},
) => {
  const snapshotsBySection = new Map();
  data
    .filter((dataPoint) => dataPoint.yyyyq === yyyyq)
    .forEach((dataPoint) => {
      if (!snapshotsBySection.has(dataPoint.section)) {
        snapshotsBySection.set(dataPoint.section, []);
      }
      snapshotsBySection.get(dataPoint.section).push(dataPoint);
    });

  const classes = new Map();
  [...snapshotsBySection.keys()].sort().forEach((section) => {
    const lectureSection = getLectureSection(section);
    if (!classes.has(lectureSection)) {
      classes.set(lectureSection, {
        lectureSection,
        discussions: [],
        total: null,
      });
    }
    const bar = createSectionBar(snapshotsBySection.get(section), passDates);
    const group = classes.get(lectureSection);
    if (isLectureSection(section)) {
      group.total = bar;
    } else {
      group.discussions.push(bar);
    }
  });
  return [...classes.values()];
};

// Stryker disable all: color choices are visual styling for chart bars
export const TOTAL_BAR_COLOR = "#0d6efd";
export const sectionBarColors = [
  "#fd7e14",
  "#20c997",
  "#d63384",
  "#ffc107",
  "#6f42c1",
  "#198754",
  "#dc3545",
  "#8c564b",
  "#adb5bd",
  "#bcbd22",
];
// Stryker restore all

export const getSectionBarColor = (index) =>
  sectionBarColors[index % sectionBarColors.length];

// Flattens classes into the bars Recharts draws, with a gap between classes.
// Each class's first bar carries its label and bar count for centering.
export const createEnrollmentBarRows = (classes = [], instructors = {}) => {
  const rows = [];
  classes.forEach((classData, classIndex) => {
    const { lectureSection } = classData;
    if (classIndex > 0) {
      rows.push({ key: `gap-${lectureSection}`, isSpacer: true });
    }
    const classRows = classData.discussions.map((bar, index) => ({
      ...bar,
      key: `${lectureSection}-${bar.section}`,
      color: getSectionBarColor(index),
    }));
    if (classData.total) {
      classRows.push({
        ...classData.total,
        key: `${lectureSection}-total`,
        color: TOTAL_BAR_COLOR,
      });
    }
    classRows[0].groupLabel =
      instructors[lectureSection] || `Lecture ${lectureSection}`;
    classRows[0].groupSize = classRows.length;
    rows.push(...classRows);
  });
  return rows;
};

export const getMaxSectionCount = (classes = []) =>
  Math.max(0, ...classes.map((classData) => classData.discussions.length));

// Maps lecture section (e.g. "0100") to instructor names.
export const getLectureInstructors = (primaries = [], courseId) =>
  Object.fromEntries(
    primaries
      .filter((p) => isSameCourse(p.courseId, courseId))
      .map((p) => [
        p.primary.section,
        p.primary.instructors.map((i) => i.instructor).join(", "),
      ]),
  );

export const hasPassData = (rows) =>
  rows.some((row) => row.pass1 != null || row.pass2 != null);

// Searches also return courses sharing the prefix, e.g. CMPSC 130AH for 130A.
export const isSameCourse = (dataPointCourseId, courseId) =>
  // Stryker disable next-line Regex : variants only differ on courseIds that don't occur
  dataPointCourseId.replace(/\s*-\d+$/, "").trim() === courseId.trim();
