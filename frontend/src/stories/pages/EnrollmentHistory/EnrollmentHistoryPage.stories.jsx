import React from "react";

import EnrollmentHistoryPage from "main/pages/EnrollmentHistory/EnrollmentHistoryPage";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import { ucsbSubjectsFixtures } from "fixtures/ucsbSubjectsFixtures";
import { enrollmentDataPointFixtures } from "fixtures/enrollmentDataPointFixtures";
import primaryFixtures from "fixtures/primaryFixtures";

import { toast } from "react-toastify";
import { http, HttpResponse } from "msw";

export default {
  title: "pages/EnrollmentHistory/EnrollmentHistoryPage",
  component: EnrollmentHistoryPage,
};

const Template = () => <EnrollmentHistoryPage />;

export const Default = Template.bind({});
Default.parameters = {
  msw: [
    http.get("/api/systemInfo", () => {
      return HttpResponse.json(systemInfoFixtures.showingBoth, {
        status: 200,
      });
    }),
    http.get("/api/currentUser", () => {
      return HttpResponse.status(403); // returns 403 when not logged in
    }),
    http.get("/api/UCSBSubjects/all", () => {
      return HttpResponse.json(ucsbSubjectsFixtures.threeSubjects, {
        status: 200,
      });
    }),
    http.get("/api/public/courseovertime/search", ({ request }) => {
      toast(`Generated ${request.method} ${request.url}`);
      return HttpResponse.json(primaryFixtures.f24_math_lowerDiv, {
        status: 200,
      });
    }),
    http.get("/api/enrollment/search", () => {
      return HttpResponse.json(
        enrollmentDataPointFixtures.cmpsc130aLectureOverTime,
        { status: 200 },
      );
    }),
  ],
};
