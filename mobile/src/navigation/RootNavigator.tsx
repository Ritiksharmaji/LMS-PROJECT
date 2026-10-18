import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { IconButton, Loading, Logo } from '../components/ui';
import { useUnreadCount } from '../lib/queries';
import { useSession, type Area } from '../lib/session';
import { fonts } from '../theme/palette';
import { usePalette } from '../theme/ThemeProvider';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotScreen, SignupScreen } from '../screens/auth/SignupScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import {
  CertificateScreen,
  GradesScreen,
  NotificationsScreen,
  OrdersScreen,
  WishlistScreen,
} from '../screens/account/AccountScreens';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminOrdersScreen, PeopleScreen } from '../screens/admin/PeopleScreen';
import { CourseScreen } from '../screens/learn/CourseScreen';
import {
  DiscussionScreen,
  NewThreadScreen,
  ThreadScreen,
} from '../screens/learn/DiscussionScreens';
import { ExploreScreen } from '../screens/learn/ExploreScreen';
import { LearnHomeScreen } from '../screens/learn/LearnHomeScreen';
import { LessonScreen } from '../screens/learn/LessonScreen';
import { MyLearningScreen } from '../screens/learn/MyLearningScreen';
import { PlayerScreen } from '../screens/learn/PlayerScreen';
import { ScheduleScreen } from '../screens/learn/ScheduleScreen';
import {
  GradingScreen,
  RosterScreen,
  SubmissionScreen,
} from '../screens/teach/GradingScreens';
import { TeachCoursesScreen } from '../screens/teach/TeachCoursesScreen';
import { TeachHomeScreen } from '../screens/teach/TeachHomeScreen';
import type { RootParams, TabParams } from './types';

const Stack = createNativeStackNavigator<RootParams>();
const Tab = createBottomTabNavigator<TabParams>();

type TabDef = {
  name: keyof TabParams;
  title: string;
  icon: IconName;
  component: React.ComponentType<any>;
};

const TABS: Record<Area, TabDef[]> = {
  learn: [
    {
      name: 'LearnHome',
      title: 'Home',
      icon: 'house',
      component: LearnHomeScreen,
    },
    {
      name: 'Explore',
      title: 'Explore',
      icon: 'compass',
      component: ExploreScreen,
    },
    {
      name: 'MyLearning',
      title: 'My learning',
      icon: 'library',
      component: MyLearningScreen,
    },
    {
      name: 'Schedule',
      title: 'Schedule',
      icon: 'calendar',
      component: ScheduleScreen,
    },
    {
      name: 'Profile',
      title: 'Profile',
      icon: 'user',
      component: ProfileScreen,
    },
  ],
  teach: [
    {
      name: 'TeachHome',
      title: 'Overview',
      icon: 'layout-dashboard',
      component: TeachHomeScreen,
    },
    {
      name: 'TeachCourses',
      title: 'Courses',
      icon: 'library',
      component: TeachCoursesScreen,
    },
    {
      name: 'Grading',
      title: 'Grading',
      icon: 'clipboard-check',
      component: GradingScreen,
    },
    {
      name: 'Schedule',
      title: 'Schedule',
      icon: 'calendar',
      component: ScheduleScreen,
    },
    {
      name: 'Profile',
      title: 'Profile',
      icon: 'user',
      component: ProfileScreen,
    },
  ],
  admin: [
    {
      name: 'AdminHome',
      title: 'Analytics',
      icon: 'chart-column',
      component: AdminHomeScreen,
    },
    { name: 'People', title: 'People', icon: 'users', component: PeopleScreen },
    {
      name: 'AdminOrders',
      title: 'Orders',
      icon: 'receipt',
      component: AdminOrdersScreen,
    },
    {
      name: 'TeachCourses',
      title: 'Courses',
      icon: 'library',
      component: TeachCoursesScreen,
    },
    {
      name: 'Profile',
      title: 'Profile',
      icon: 'user',
      component: ProfileScreen,
    },
  ],
};

function Bell() {
  const nav = useNavigation();
  const unread = useUnreadCount();
  return (
    <IconButton
      icon="bell"
      label="Notifications"
      badge={unread.data?.unread}
      onPress={() => nav.navigate('Notifications')}
    />
  );
}

const HeaderLogo = () => <Logo size={22} />;

const HeaderBell = () => (
  <View style={{ marginRight: 8 }}>
    <Bell />
  </View>
);

/** Tab icons fill in when their tab is active. */
const tabIcon =
  (name: IconName) =>
  ({ color, focused }: { color: string; focused: boolean }) =>
    (
      <Icon
        name={name}
        size={24}
        color={color}
        weight={focused ? 'fill' : 'duotone'}
      />
    );

function Tabs() {
  const p = usePalette();
  const { area } = useSession();
  return (
    <Tab.Navigator
      key={area}
      screenOptions={{
        headerStyle: { backgroundColor: p.bg },
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitle: HeaderLogo,
        headerRight: HeaderBell,
        tabBarActiveTintColor: p.accent,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: { backgroundColor: p.card, borderTopColor: p.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      {TABS[area].map(t => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            title: t.title,
            tabBarIcon: tabIcon(t.icon),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const p = usePalette();
  const { status } = useSession();
  if (status === 'loading') return <Loading />;
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: p.bg },
        headerShadowVisible: false,
        headerTintColor: p.text,
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontSize: 16,
          color: p.text,
        },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: p.bg },
      }}
    >
      {status === 'signedOut' ? (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: '' }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: '' }}
          />
          <Stack.Screen
            name="Forgot"
            component={ForgotScreen}
            options={{ title: '' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={Tabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Course"
            component={CourseScreen}
            options={({ route }) => ({ title: route.params.title ?? 'Course' })}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={({ route }) => ({ title: route.params.title ?? 'Course' })}
          />
          <Stack.Screen
            name="Lesson"
            component={LessonScreen}
            options={{ title: 'Lesson' }}
          />
          <Stack.Screen
            name="Discussion"
            component={DiscussionScreen}
            options={{ title: 'Discussion' }}
          />
          <Stack.Screen
            name="Thread"
            component={ThreadScreen}
            options={{ title: 'Thread' }}
          />
          <Stack.Screen
            name="NewThread"
            component={NewThreadScreen}
            options={{ title: 'New question', presentation: 'modal' }}
          />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Grades" component={GradesScreen} />
          <Stack.Screen name="Wishlist" component={WishlistScreen} />
          <Stack.Screen
            name="Orders"
            component={OrdersScreen}
            options={{ title: 'Orders & refunds' }}
          />
          <Stack.Screen
            name="Certificate"
            component={CertificateScreen}
            options={{ title: 'Certificate' }}
          />
          <Stack.Screen
            name="Roster"
            component={RosterScreen}
            options={({ route }) => ({
              title: route.params.title ?? 'Learners',
            })}
          />
          <Stack.Screen
            name="Submission"
            component={SubmissionScreen}
            options={{ title: 'Submission' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
