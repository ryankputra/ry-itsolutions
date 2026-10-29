import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Home, Bell, Sparkles, User, History, Music } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleTabPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: -0.2,
          marginTop: 2,
        },
      }}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <Home size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikasi',
          tabBarIcon: ({ color, focused }) => (
            <Bell size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Game Koin',
          tabBarIcon: ({ color, focused }) => (
            <Sparkles size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Saya',
          tabBarIcon: ({ color, focused }) => (
            <User size={20} color={color} strokeWidth={focused ? 2.2 : 1.75} />
          ),
        }}
      />

      {/* Hidden Auxiliary Tabs for deep routing parity */}
      <Tabs.Screen
        name="history"
        options={{
          href: null,
          title: 'Riwayat',
          tabBarIcon: ({ color }) => <History size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entertainment"
        options={{
          href: null,
          title: 'Hiburan',
          tabBarIcon: ({ color }) => <Music size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
