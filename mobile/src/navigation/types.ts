import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParams = {
  LearnHome: undefined;
  Explore: { category?: string } | undefined;
  MyLearning: undefined;
  Schedule: undefined;
  TeachHome: undefined;
  TeachCourses: undefined;
  Grading: undefined;
  AdminHome: undefined;
  People: undefined;
  AdminOrders: undefined;
  Profile: undefined;
};

export type RootParams = {
  Welcome: undefined;
  Login: { email?: string } | undefined;
  Signup: undefined;
  Forgot: undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  Course: { slug: string; title?: string };
  Player: { courseId: string; title?: string };
  Lesson: { lessonId: string; courseId: string };
  Discussion: { courseId: string; title?: string };
  Thread: { threadId: string };
  NewThread: { courseId: string; lessonId?: string };
  Notifications: undefined;
  Grades: undefined;
  Wishlist: undefined;
  Orders: undefined;
  Certificate: { code: string };
  Roster: { courseId: string; title?: string };
  Submission: { id: string };
};

export type RootScreen<K extends keyof RootParams> = NativeStackScreenProps<
  RootParams,
  K
>;
export type TabScreen<K extends keyof TabParams> = CompositeScreenProps<
  BottomTabScreenProps<TabParams, K>,
  NativeStackScreenProps<RootParams>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootParams {}
  }
}
