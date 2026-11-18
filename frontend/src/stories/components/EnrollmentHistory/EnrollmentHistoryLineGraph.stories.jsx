import React from "react";

import EnrollmentHistoryLineGraph from "main/components/EnrollmentHistory/EnrollmentHistoryLineGraph";
import { enrollmentDataPointFixtures } from "fixtures/enrollmentDataPointFixtures";

export default {
  title: "components/EnrollmentHistory/EnrollmentHistoryLineGraph",
  component: EnrollmentHistoryLineGraph,
};

const Template = (args) => {
  return <EnrollmentHistoryLineGraph {...args} />;
};

export const OneLectureOverTime = Template.bind({});
OneLectureOverTime.args = {
  data: enrollmentDataPointFixtures.cmpsc130aLectureOverTime,
  title: "CMPSC 130A Lecture Enrollment Over Time",
};

export const MultipleSectionsOverTime = Template.bind({});
MultipleSectionsOverTime.args = {
  data: enrollmentDataPointFixtures.cmpsc130aMultipleSectionsOverTime,
  title: "CMPSC 130A Section Enrollment Over Time",
};

export const MultipleQuarters = Template.bind({});
MultipleQuarters.args = {
  data: enrollmentDataPointFixtures.cmpsc130aMultipleQuarters,
  title: "CMPSC 130A Enrollment Across Quarters",
};
