const enrollmentDataPointFixtures = {
  cmpsc130aLectureOverTime: [
    {
      id: 1,
      yyyyq: "20262",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 32,
      dateCreated: "2026-04-06T08:15:00.000000",
    },
    {
      id: 2,
      yyyyq: "20262",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 41,
      dateCreated: "2026-04-13T08:15:00.000000",
    },
    {
      id: 3,
      yyyyq: "20262",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 48,
      dateCreated: "2026-05-26T19:58:14.226209",
    },
  ],

  cmpsc130aMultipleSectionsOverTime: [
    {
      id: 4,
      yyyyq: "20262",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 41,
      dateCreated: "2026-04-13T08:15:00.000000",
    },
    {
      id: 5,
      yyyyq: "20262",
      enrollCd: "07617",
      courseId: "CMPSC   130A -1",
      section: "0101",
      enrollment: 18,
      dateCreated: "2026-04-13T08:15:00.000000",
    },
    {
      id: 6,
      yyyyq: "20262",
      enrollCd: "07625",
      courseId: "CMPSC   130A -1",
      section: "0102",
      enrollment: 21,
      dateCreated: "2026-04-13T08:15:00.000000",
    },
    {
      id: 7,
      yyyyq: "20262",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 48,
      dateCreated: "2026-05-26T19:58:14.226209",
    },
    {
      id: 8,
      yyyyq: "20262",
      enrollCd: "07617",
      courseId: "CMPSC   130A -1",
      section: "0101",
      enrollment: 24,
      dateCreated: "2026-05-26T19:58:14.226209",
    },
    {
      id: 9,
      yyyyq: "20262",
      enrollCd: "07625",
      courseId: "CMPSC   130A -1",
      section: "0102",
      enrollment: 27,
      dateCreated: "2026-05-26T19:58:14.226209",
    },
  ],

  cmpsc130aMultipleQuarters: [
    {
      id: 10,
      yyyyq: "20254",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 62,
      dateCreated: "2025-11-03T08:15:00.000000",
    },
    {
      id: 11,
      yyyyq: "20261",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 54,
      dateCreated: "2026-02-02T08:15:00.000000",
    },
    {
      id: 12,
      yyyyq: "20262",
      enrollCd: "07609",
      courseId: "CMPSC   130A -1",
      section: "0100",
      enrollment: 48,
      dateCreated: "2026-05-26T19:58:14.226209",
    },
  ],
};

// Snapshot dates that fall in pass 1, pass 2, and after pass 3 (spring2026)
const springSnapshotDates = [
  "2026-02-10T08:15:00.000000",
  "2026-02-25T08:15:00.000000",
  "2026-04-01T08:15:00.000000",
];

let nextBarFixtureId = 1000;
const makeSeries = (yyyyq, section, enrollCd, counts, dates) =>
  counts.map((enrollment, index) => ({
    id: nextBarFixtureId++,
    yyyyq,
    enrollCd,
    courseId: "CMPSC   130A -1",
    section,
    enrollment,
    dateCreated: dates[index],
  }));

const spring = (section, enrollCd, counts) =>
  makeSeries("20262", section, enrollCd, counts, springSnapshotDates);

const enrollmentBarChartFixtures = {
  twoLecturesWithSections: [
    ...spring("0100", "07609", [40, 72, 95]),
    ...spring("0101", "07617", [12, 20, 25]),
    ...spring("0102", "07625", [10, 18, 24]),
    ...spring("0103", "07633", [9, 17, 23]),
    ...spring("0104", "07641", [9, 17, 23]),
    ...spring("0200", "07658", [30, 55, 70]),
    ...spring("0201", "07666", [11, 19, 24]),
    ...spring("0202", "07674", [10, 18, 23]),
    ...spring("0203", "07682", [9, 18, 23]),
  ],

  manyLecturesNoSections: [
    "0100",
    "0200",
    "0300",
    "0400",
    "0500",
    "0600",
    "0700",
    "0800",
  ].flatMap((section, index) =>
    spring(section, `0${7700 + index}`, [
      20 + index * 3,
      40 + index * 4,
      60 + index * 5,
    ]),
  ),

  singleLecture: [...spring("0100", "07609", [32, 41, 48])],

  // No lecture data; section 0102 has no data from before pass 3
  missingData: [
    ...spring("0101", "07617", [12, 20, 25]),
    ...makeSeries("20262", "0102", "07625", [24], [springSnapshotDates[2]]),
  ],

  twoQuarters: [
    ...spring("0100", "07609", [40, 72, 95]),
    ...spring("0101", "07617", [12, 20, 25]),
    ...makeSeries(
      "20264",
      "0100",
      "07609",
      [35, 60, 80],
      [
        "2026-05-12T08:15:00.000000",
        "2026-05-28T08:15:00.000000",
        "2026-09-20T08:15:00.000000",
      ],
    ),
  ],
};

// Pass dates shaped like /api/public/allQuarters rows
const enrollmentPassDatesFixtures = {
  spring2026: {
    quarter: "20262",
    pass1Begin: "2026-02-01T09:00:00",
    pass2Begin: "2026-02-15T09:00:00",
    pass3Begin: "2026-03-01T09:00:00",
  },
  fall2026: {
    quarter: "20264",
    pass1Begin: "2026-05-04T09:00:00",
    pass2Begin: "2026-05-18T09:00:00",
    pass3Begin: "2026-06-01T09:00:00",
  },
};

export {
  enrollmentDataPointFixtures,
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
};
