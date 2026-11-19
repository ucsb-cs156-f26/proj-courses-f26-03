import React from "react";

import CSVDownloadsPage from "main/pages/CSV/CSVDownloadsPage";

import { allTheSubjects } from "fixtures/subjectFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

import { http, HttpResponse } from "msw";
import { expect, within } from "storybook/test";

export default {
  title: "pages/CSV/CSVDownloadsPage",
  component: CSVDownloadsPage,
};

const Template = () => <CSVDownloadsPage />;
const enrollmentEndpoint = "/api/enrollment/csv/quarter";

const pageHandlers = [
  http.get("/api/systemInfo", () => {
    return HttpResponse.json(systemInfoFixtures.showingBoth, {
      status: 200,
    });
  }),
  http.get("/api/currentUser", () => {
    return new HttpResponse(null, { status: 403 }); // returns 403 when not logged in
  }),
  http.get("/api/UCSBSubjects/all", () => HttpResponse.json(allTheSubjects)),
];

const enrollmentSuccessHandler = http.get(enrollmentEndpoint, ({ request }) => {
  const yyyyq = new URL(request.url).searchParams.get("yyyyq");
  const month = ["01", "04", "07", "10"][Number(yyyyq[4]) - 1];
  const date = `${yyyyq.slice(0, 4)}-${month}-15`;
  const csv = [
    "COURSEID,DATECREATED,ENROLLCD,ENROLLMENT,ID,SECTION,YYYYQ",
    `CMPSC 130A,${date}T09:00,07609,96,1,0100,${yyyyq}`,
    `CMPSC 130A,${date}T09:00,07617,24,2,0101,${yyyyq}`,
    "",
  ].join("\n");

  return new HttpResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=UTF-8",
      "Content-Disposition": `attachment;filename=enrollment_${yyyyq}.csv`,
    },
  });
});

const enrollmentSuccessHandlers = [...pageHandlers, enrollmentSuccessHandler];

export const Default = Template.bind({});
Default.parameters = { msw: enrollmentSuccessHandlers };

export const EnrollmentDownload = Template.bind({});
EnrollmentDownload.parameters = { msw: enrollmentSuccessHandlers };

export const EnrollmentDownloadError = Template.bind({});
EnrollmentDownloadError.parameters = {
  msw: [
    ...pageHandlers,
    http.get(enrollmentEndpoint, () => new HttpResponse(null, { status: 500 })),
  ],
};
EnrollmentDownloadError.play = async ({ canvas, userEvent }) => {
  await userEvent.click(
    canvas.getByRole("button", { name: "Enrollment Downloads" }),
  );

  const enrollmentForm = within(
    canvas.getByTestId("CSVDownloads.EnrollmentQuarter").closest("form"),
  );
  await userEvent.click(
    enrollmentForm.getByRole("button", { name: "Download CSV" }),
  );

  await expect(await canvas.findByRole("alert")).toHaveTextContent(
    "Unable to download enrollment CSV. Please try again.",
  );
  await expect(
    enrollmentForm.getByRole("button", { name: "Download CSV" }),
  ).toBeEnabled();
};
