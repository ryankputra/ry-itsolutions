import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Home, Bell, Sparkles, User, History, Music } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingMiniPlayer } from '../../components/ui/FloatingMiniPlayer';
import { FloatingWhatsAppSpeedDial } from '../../components/ui/FloatingWhatsAppSpeedDial';
import { useAppTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme, colors } = useAppTheme();
  const isDark = theme === 'dark';

  const handleTabPress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
  };

  const renderTabIcon = (IconComponent: any, color: any, focused: boolean) => {
    if (focused) {
      return (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(41, 151, 255, 0.16)' : 'rgba(41, 151, 255, 0.12)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent size={19} color={color} strokeWidth={2.4} />
        </View>
      );
    }
    return <IconComponent size={20} color={color} strokeWidth={1.75} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: {
            backgroundColor: isDark ? 'rgba(18, 18, 22, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.65)',
            borderTopWidth: 1,
            height: 60 + Math.max(insets.bottom, 12),
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 16,
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
            tabBarIcon: ({ color, focused }) => renderTabIcon(Home, color, focused),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifikasi',
            tabBarIcon: ({ color, focused }) => renderTabIcon(Bell, color, focused),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: 'Game Koin',
            tabBarIcon: ({ color, focused }) => renderTabIcon(Sparkles, color, focused),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Saya',
            tabBarIcon: ({ color, focused }) => renderTabIcon(User, color, focused),
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
      <FloatingMiniPlayer />
      <FloatingWhatsAppSpeedDial />
    </View>
  );
}
