import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { MusicProvider } from '../context/MusicContext';
import { FullMusicPlayerModal } from '../components/ui/FullMusicPlayerModal';
import { Colors } from '../theme/colors';

// Keep the splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading } = useAuth();
  const { colors } = useAppTheme();

  useEffect(() => {
    async function checkOtaUpdates() {
      try {
        if (__DEV__) {
          console.log('[OTA Updates] Development mode detected, skipping automatic update check.');
          return;
        }
        if (Updates.isEnabled) {
          console.log('[OTA Updates] Checking for latest release updates...');
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('[OTA Updates] New update bundle found. Downloading...');
            await Updates.fetchUpdateAsync();
            console.log('[OTA Updates] Update ready. Reloading app to apply latest version...');
            await Updates.reloadAsync();
          } else {
            console.log('[OTA Updates] App is up to date.');
          }
        }
      } catch (e: any) {
        console.warn('[OTA Updates] Unable to check or fetch update:', e?.message || e);
      }
    }
    checkOtaUpdates();
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen
        name="(screens)"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="(admin)"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

function MainLayout() {
  const { theme, colors } = useAppTheme();
  const isDark = theme === 'dark';

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      primary: Colors.dark.primary,
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
      card: Colors.light.surface,
      text: Colors.light.text,
      border: Colors.light.border,
      primary: Colors.light.primary,
    },
  };

  return (
    <NavigationThemeProvider value={isDark ? customDarkTheme : customLightTheme}>
      <AuthProvider>
        <MusicProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
          <FullMusicPlayerModal />
        </MusicProvider>
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
