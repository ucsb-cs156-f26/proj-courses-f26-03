import GEAreaCoursesTable from "main/components/GEAreas/GEAreaCoursesTable";

export default {
  title: "components/GEAreas/GEAreaCoursesTable",
  component: GEAreaCoursesTable,
};

const Template = (args) => <GEAreaCoursesTable {...args} />;

export const SummerSessions = Template.bind({});
SummerSessions.args = {
  courses: [
    {
      quarter: "20233",
      courseId: "CMPSC 156",
      title: "Software Engineering",
      description: "Software Engineering course",
      generalEducation: ["A1"],
      primary: { session: "00000A" },
    },
    {
      quarter: "20233",
      courseId: "MATH 4A",
      title: "Linear Algebra",
      description: "Linear Algebra course",
      generalEducation: ["C"],
      primary: { session: "00000B" },
    },
  ],
};

export const NonSummer = Template.bind({});
NonSummer.args = {
  courses: [
    {
      quarter: "20234",
      courseId: "CMPSC 156",
      title: "Software Engineering",
      description: "Software Engineering course",
      generalEducation: ["A1"],
      primary: { session: "00000A" },
    },
  ],
};
