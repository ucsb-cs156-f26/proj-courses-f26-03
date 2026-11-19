import React from "react";
import EnrollmentHistorySectionsTable from "main/components/EnrollmentHistory/EnrollmentHistorySectionsTable";
import primaryFixtures from "fixtures/primaryFixtures";

export default {
  title: "components/EnrollmentHistory/EnrollmentHistorySectionsTable",
  component: EnrollmentHistorySectionsTable,
};

const Template = (args) => {
  return <EnrollmentHistorySectionsTable {...args} />;
};

export const Empty = Template.bind({});
Empty.args = {
  sections: [],
};

export const f24_math_lowerDiv = Template.bind({});
f24_math_lowerDiv.args = {
  sections: primaryFixtures.f24_math_lowerDiv,
};

export const WithSession = Template.bind({});
WithSession.args = {
  sections: primaryFixtures.f24_math_lowerDiv,
  showSession: true,
};
