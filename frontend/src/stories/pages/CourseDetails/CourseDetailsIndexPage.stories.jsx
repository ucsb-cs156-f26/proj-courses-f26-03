import React from "react";

import CourseDetailsIndexPage from "main/pages/CourseDetails/CourseDetailsIndexPage";

import { ucsbSubjectsFixtures } from "fixtures/ucsbSubjectsFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import { personalSectionsFixtures } from "fixtures/personalSectionsFixtures";
import { oneQuarterCourse } from "fixtures/gradeHistoryFixtures";

import { http, HttpResponse } from "msw";

import { MemoryRouter, Route, Routes } from "react-router-dom";
import { finalsFixtures } from "fixtures/finalsFixtures";
import {
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
} from "fixtures/enrollmentDataPointFixtures";

// Sample enrollment data relabelled as CHEM 184 in W22 and S22
const chem184EnrollmentHistory = [
  ...enrollmentBarChartFixtures.twoLecturesWithSections.map((dataPoint) => ({
    ...dataPoint,
    yyyyq: "20221",
    courseId: "CHEM    184 -1",
  })),
  ...enrollmentBarChartFixtures.twoQuarters
    .filter((dataPoint) => dataPoint.yyyyq === "20264")
    .map((dataPoint) => ({
      ...dataPoint,
      yyyyq: "20222",
      courseId: "CHEM    184 -1",
    })),
];
const allQuarters = [
  { ...enrollmentPassDatesFixtures.spring2026, quarter: "20221" },
  { ...enrollmentPassDatesFixtures.fall2026, quarter: "20222" },
];

export default {
  title: "pages/CourseDetails/CourseDetailsIndexPage",
  component: CourseDetailsIndexPage,
};

const Template = (args) => {
  return (
    <MemoryRouter initialEntries={["/coursedetails/20221/06619"]}>
      <Routes>
        <Route
          path="/coursedetails/:qtr/:enrollCode"
          element={<CourseDetailsIndexPage {...args} />}
        />
      </Routes>
    </MemoryRouter>
  );
};

export const Default = Template.bind({});
Default.args = {
  suppressMemoryRouter: true,
};
Default.parameters = {
  msw: [
    http.get("/api/UCSBSubjects/all", () => {
      return HttpResponse.json(ucsbSubjectsFixtures.threeSubjects, {
        status: 200,
      });
    }),
    http.get("/api/systemInfo", () => {
      return HttpResponse.json(systemInfoFixtures.showingBoth, {
        status: 200,
      });
    }),
    http.get("/api/currentUser", () => {
      return HttpResponse.status(403); // returns 403 when not logged in
    }),
    http.get("/api/sections/sectionsearch", () => {
      return HttpResponse.json(personalSectionsFixtures.singleSection, {
        status: 200,
      });
    }),
    http.get("/api/gradehistory/search", () => {
      return HttpResponse.json(oneQuarterCourse, {
        status: 200,
      });
    }),
    http.get("/api/public/finalsInfo", () => {
      return HttpResponse.json(finalsFixtures.cmpsc24_s26, {
        status: 200,
      });
    }),
    http.get("/api/enrollment/search", () => {
      return HttpResponse.json(chem184EnrollmentHistory, {
        status: 200,
      });
    }),
    http.get("/api/public/allQuarters", () => {
      return HttpResponse.json(allQuarters, {
        status: 200,
      });
    }),
  ],
};
