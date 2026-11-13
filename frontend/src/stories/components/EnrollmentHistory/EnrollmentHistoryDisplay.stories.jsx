import React from "react";
import { http, HttpResponse, delay } from "msw";
import EnrollmentHistoryDisplay from "main/components/EnrollmentHistory/EnrollmentHistoryDisplay";
import { enrollmentDataPointFixtures } from "fixtures/enrollmentDataPointFixtures";

export default {
  title: "components/EnrollmentHistory/EnrollmentHistoryDisplay",
  component: EnrollmentHistoryDisplay,
};

const Template = (args) => {
  return <EnrollmentHistoryDisplay {...args} />;
};

const selection = {
  quarter: "20262",
  courseId: "CMPSC   130A ",
  enrollCode: "07609",
};

export const WithData = Template.bind({});
WithData.args = { selection };
WithData.parameters = {
  msw: [
    http.get("/api/enrollment/search", () =>
      HttpResponse.json(enrollmentDataPointFixtures.cmpsc130aLectureOverTime),
    ),
  ],
};

export const Loading = Template.bind({});
Loading.args = { selection };
Loading.parameters = {
  msw: [
    http.get("/api/enrollment/search", async () => {
      await delay("infinite");
    }),
  ],
};

export const ErrorState = Template.bind({});
ErrorState.args = { selection };
ErrorState.parameters = {
  msw: [
    http.get("/api/enrollment/search", () =>
      HttpResponse.json({}, { status: 500 }),
    ),
  ],
};

export const NoData = Template.bind({});
NoData.args = { selection };
NoData.parameters = {
  msw: [http.get("/api/enrollment/search", () => HttpResponse.json([]))],
};
