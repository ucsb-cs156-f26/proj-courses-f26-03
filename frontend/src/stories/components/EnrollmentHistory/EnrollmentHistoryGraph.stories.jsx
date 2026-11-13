import React from "react";

import EnrollmentHistoryGraph from "main/components/EnrollmentHistory/EnrollmentHistoryGraph";
import {
  enrollmentBarChartFixtures,
  enrollmentPassDatesFixtures,
} from "fixtures/enrollmentDataPointFixtures";

export default {
  title: "components/EnrollmentHistory/EnrollmentHistoryGraph",
  component: EnrollmentHistoryGraph,
};

const Template = (args) => {
  return <EnrollmentHistoryGraph {...args} />;
};

export const TwoLecturesWithSections = Template.bind({});
TwoLecturesWithSections.args = {
  data: enrollmentBarChartFixtures.twoLecturesWithSections,
  yyyyq: "20262",
  passDates: enrollmentPassDatesFixtures.spring2026,
  title: "CMPSC 130A Enrollment – S26",
};

export const ManyLecturesNoSections = Template.bind({});
ManyLecturesNoSections.args = {
  data: enrollmentBarChartFixtures.manyLecturesNoSections,
  yyyyq: "20262",
  passDates: enrollmentPassDatesFixtures.spring2026,
  title: "Eight Lectures, No Discussion Sections",
};

export const SingleLecture = Template.bind({});
SingleLecture.args = {
  data: enrollmentBarChartFixtures.singleLecture,
  yyyyq: "20262",
  passDates: enrollmentPassDatesFixtures.spring2026,
  title: "Single Lecture",
};

export const MissingData = Template.bind({});
MissingData.args = {
  data: enrollmentBarChartFixtures.missingData,
  yyyyq: "20262",
  passDates: enrollmentPassDatesFixtures.spring2026,
  title: "Missing Lecture Data",
};
