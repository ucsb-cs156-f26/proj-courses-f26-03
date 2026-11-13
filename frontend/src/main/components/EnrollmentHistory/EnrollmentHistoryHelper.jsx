// Stryker disable all: color choices are visual styling for chart series
export const lineColors = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#0088fe",
  "#00c49f",
];
// Stryker restore all

export const getEnrollmentSeriesKey = (dataPoint) =>
  `${dataPoint.enrollCd}-${dataPoint.section}`;

export const getEnrollmentSeriesLabel = (dataPoint) =>
  `${dataPoint.enrollCd} - Section ${dataPoint.section}`;

export const formatDateCreated = (dateCreated) => dateCreated.slice(0, 10);

export const formatEnrollmentTooltip = (value, name) => [
  `Enrollment: ${value}`,
  name,
];

export const createEnrollmentHistoryChartData = (data = []) => {
  const sortedData = [...data].sort((a, b) =>
    a.dateCreated.localeCompare(b.dateCreated),
  );
  const seriesByKey = new Map();
  const chartDataByDate = new Map();

  sortedData.forEach((dataPoint) => {
    const seriesKey = getEnrollmentSeriesKey(dataPoint);

    if (!seriesByKey.has(seriesKey)) {
      seriesByKey.set(seriesKey, {
        dataKey: `series${seriesByKey.size}`,
        name: getEnrollmentSeriesLabel(dataPoint),
      });
    }

    if (!chartDataByDate.has(dataPoint.dateCreated)) {
      chartDataByDate.set(dataPoint.dateCreated, {
        dateCreated: dataPoint.dateCreated,
      });
    }

    const chartRow = chartDataByDate.get(dataPoint.dateCreated);
    chartRow[seriesByKey.get(seriesKey).dataKey] = dataPoint.enrollment;
  });

  return {
    chartData: Array.from(chartDataByDate.values()),
    series: Array.from(seriesByKey.values()),
  };
};

// Returns the lecture a section belongs to, e.g. "0101" -> "0100".
export const getLectureSection = (section) => `${section.slice(0, 2)}00`;

// True for lecture sections, which end in "00".
export const isLectureSection = (section) => section.endsWith("00");

// Returns the sorted, unique quarters (yyyyq) found in the data.
export const getEnrollmentQuarters = (data = []) =>
  [...new Set(data.map((dataPoint) => dataPoint.yyyyq))].sort();

// Returns the latest enrollment recorded before the cutoff, or null if none.
export const getEnrollmentBefore = (snapshots, cutoff) => {
  const before = snapshots.filter((snapshot) => snapshot.dateCreated < cutoff);
  return before.length > 0 ? before[before.length - 1].enrollment : null;
};

// Turns one section's snapshots into a bar with its final enrollment and
// the enrollment at the end of pass 1 and pass 2.
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

// Groups one quarter's data into classes (one per lecture). Each class has a
// bar per discussion section and a Total bar, which is the lecture's own
// enrollment so students in both lecture and discussion are counted once.
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
// Total is always blue; discussion colors contain no blue.
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

// Picks a discussion color by position, wrapping around if needed.
export const getSectionBarColor = (index) =>
  sectionBarColors[index % sectionBarColors.length];

// Flattens classes into the left-to-right list of bars Recharts draws, with
// an empty gap bar between classes. The first bar of each class carries the
// lecture's instructor (or section number if unknown) and how many bars the
// class has, so the label can be centered under all of them.
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

// Most discussion sections any class has, so the legend lists each color.
export const getMaxSectionCount = (classes = []) =>
  Math.max(0, ...classes.map((classData) => classData.discussions.length));

// Maps each lecture section (e.g. "0100") to its instructor names, from the
// course-over-time search results for this course.
export const getLectureInstructors = (primaries = [], courseId = "") =>
  Object.fromEntries(
    primaries
      .filter((p) => isSameCourse(p.courseId, courseId))
      .map((p) => [
        p.primary.section,
        p.primary.instructors.map((i) => i.instructor).join(", "),
      ]),
  );

// True if any bar has a pass 1 or pass 2 value to draw.
export const hasPassData = (rows = []) =>
  rows.some((row) => row.pass1 != null || row.pass2 != null);

// True if a courseId (e.g. "CMPSC   130A -1" or "CMPSC   130A ") is this
// course, since searches also return courses sharing the prefix.
export const isSameCourse = (dataPointCourseId, courseId) =>
  // Stryker disable next-line Regex : variants only differ on courseIds that don't occur
  dataPointCourseId.replace(/\s*-\d+$/, "").trim() === courseId.trim();
