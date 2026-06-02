import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import FeedScreen from '../screens/FeedScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import MarksScreen from '../screens/MarksScreen';
import ReportCardScreen from '../screens/ReportCardScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';
import TimetableScreen from '../screens/TimetableScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.surface,
    text: theme.text,
    border: theme.border,
    primary: theme.brand,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: theme.border, height: 60, paddingBottom: 6, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, any> = {
            Home: 'home-outline',
            Feed: 'megaphone-outline',
            Inbox: 'notifications-outline',
            Chat: 'chatbubbles-outline',
            Profile: 'person-circle-outline',
          };
          return <Ionicons name={map[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Inbox" component={NotificationsScreen} />
      <Tab.Screen name="Chat" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={lightTheme}>
      <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
            <Stack.Screen name="Marks" component={MarksScreen} options={{ title: 'Marks' }} />
            <Stack.Screen name="ReportCard" component={ReportCardScreen} options={{ title: 'Report card' }} />
            <Stack.Screen name="Assignments" component={AssignmentsScreen} options={{ title: 'Assignments' }} />
            <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} options={{ title: 'Assignment' }} />
            <Stack.Screen name="Timetable" component={TimetableScreen} options={{ title: 'Timetable' }} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: 'Chat' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
