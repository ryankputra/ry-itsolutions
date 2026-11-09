import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useAppTheme } from '../../context/ThemeContext';

interface LiquidGlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  isInteractive?: boolean;
  intensity?: 'subtle' | 'medium' | 'prominent';
  variant?: 'card' | 'icon' | 'pill' | 'nav';
}

/**
 * LiquidGlassView: Komponen adaptasi efek styling 'Liquid Glass iOS'
 * untuk UI mobile Expo (iOS & Android).
 * Menggunakan native Apple Liquid Glass jika tersedia pada iOS 18+,
 * serta fallback multi-layer specular & translucent glassmorphism yang presisi.
 */
export function LiquidGlassView({
  children,
  style,
  tintColor,
  isInteractive = false,
  intensity = 'medium',
  variant = 'card',
}: LiquidGlassViewProps) {
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const hasNativeLiquidGlass =
    Platform.OS === 'ios' &&
    typeof isLiquidGlassAvailable === 'function' &&
    isLiquidGlassAvailable();

  const getBorderColor = () => {
    if (tintColor) {
      return isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.75)';
    }
    return isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.65)';
  };

  const getGlassBackground = () => {
    if (tintColor) {
      return tintColor;
    }
    if (isDark) {
      return intensity === 'prominent'
        ? 'rgba(30, 30, 35, 0.85)'
        : intensity === 'medium'
        ? 'rgba(24, 24, 28, 0.75)'
        : 'rgba(20, 20, 24, 0.6)';
    }
    return intensity === 'prominent'
      ? 'rgba(255, 255, 255, 0.92)'
      : intensity === 'medium'
      ? 'rgba(255, 255, 255, 0.8)'
      : 'rgba(255, 255, 255, 0.65)';
  };

  if (hasNativeLiquidGlass) {
    return (
      <GlassView
        style={[
          styles.baseGlass,
          {
            borderColor: getBorderColor(),
            backgroundColor: getGlassBackground(),
          },
          variant === 'icon' && styles.iconVariant,
          variant === 'pill' && styles.pillVariant,
          variant === 'nav' && styles.navVariant,
          style,
        ]}
        tintColor={tintColor}
        isInteractive={isInteractive}
        glassEffectStyle="regular"
      >
        {/* Specular Top Rim Reflection for iOS Liquid Glass Aesthetic */}
        <View
          pointerEvents="none"
          style={[
            styles.specularRim,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)' },
          ]}
        />
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.baseGlass,
        {
          borderColor: getBorderColor(),
          backgroundColor: getGlassBackground(),
        },
        variant === 'icon' && styles.iconVariant,
        variant === 'pill' && styles.pillVariant,
        variant === 'nav' && styles.navVariant,
        style,
      ]}
    >
      {/* Specular Top Rim Reflection (Liquid Glass highlight) */}
      <View
        pointerEvents="none"
        style={[
          styles.specularRim,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.6)' },
        ]}
      />
      {children}
    </View>
  );
}

/**
 * LiquidGlassIconBox: Wadah khusus icon grid menu dengan styling Liquid Glass iOS
 */
export function LiquidGlassIconBox({
  children,
  style,
  tintColor,
  accentColor,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  accentColor?: string;
}) {
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  return (
    <View
      style={[
        styles.liquidIconContainer,
        {
          backgroundColor: tintColor || (isDark ? 'rgba(41, 151, 255, 0.12)' : 'rgba(41, 151, 255, 0.1)'),
          borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.65)',
          shadowColor: accentColor || '#000000',
        },
        style,
      ]}
    >
      {/* Upper Specular Light Sheen (iOS Liquid Glass lens effect) */}
      <View
        pointerEvents="none"
        style={[
          styles.iconSpecularSheen,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.55)',
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  baseGlass: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconVariant: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillVariant: {
    borderRadius: 9999,
  },
  navVariant: {
    borderTopWidth: 1,
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  liquidIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconSpecularSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
