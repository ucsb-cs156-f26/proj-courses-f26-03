import React from "react";

import CourseDetailsTable from "main/components/CourseDetails/CourseDetailsTable";
import { personalSectionsFixtures } from "fixtures/personalSectionsFixtures";

export default {
  title: "components/CourseDetails/CourseDetailsTable",
  component: CourseDetailsTable,
};

const Template = (args) => {
  return <CourseDetailsTable {...args} />;
};

export const Empty = Template.bind({});
Empty.args = {
  details: [],
};

export const threeCourses = Template.bind({});
threeCourses.args = {
  details: personalSectionsFixtures.threePersonalSections,
};

const baseCourse = personalSectionsFixtures.threePersonalSections[0];

const makeSessionCourse = (quarter, session) => ({
  ...baseCourse,
  quarter,
  classSections: [
    {
      ...baseCourse.classSections[0],
      session,
    },
  ],
});

export const SummerSessions = Template.bind({});

SummerSessions.args = {
  details: [
    makeSessionCourse("20233", "00000A"),
    makeSessionCourse("20233", "00000B"),
  ],
};

export const NonSummer = Template.bind({});

NonSummer.args = {
  details: [makeSessionCourse("20234", "00000A")],
};
