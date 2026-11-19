import UsersSearchBar from "main/components/Users/UsersSearchBar";

export default {
  title: "components/Users/UsersSearchBar",
  component: UsersSearchBar,
};

const Template = (args) => {
  return <UsersSearchBar {...args} />;
};

export const Default = Template.bind({});
Default.args = {
  updateSearch: (s) => {
    console.log(`updateSearch: ${s}`);
  },
};
