export type RootStackParamList = {
  PostDetails: {id: string};
  NotFound: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  TabNavigator: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
