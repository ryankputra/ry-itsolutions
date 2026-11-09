import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { useColorScheme } from 'react-native';

interface UserAvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  imageStyle?: ImageStyle;
  iconFallback?: boolean;
}

export function UserAvatar({
  uri,
  name = 'User',
  size = 56,
  style,
  textStyle,
  imageStyle,
  iconFallback = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const borderRadius = size / 2;

  const validUri = uri && typeof uri === 'string' && uri.trim().length > 0 && (uri.startsWith('http') || uri.startsWith('data:') || uri.startsWith('file:'));

  if (validUri && !hasError) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: isDark ? '#27272a' : '#f4f4f5',
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius },
            imageStyle,
          ]}
          onError={() => setHasError(true)}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Safe fallback UI
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: isDark ? 'rgba(41, 151, 255, 0.15)' : '#e0f2fe',
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {iconFallback ? (
        <UserIcon size={size * 0.48} color={colors.primary} />
      ) : (
        <Text
          style={[
            styles.initialText,
            {
              fontSize: Math.max(12, Math.floor(size * 0.42)),
              color: colors.primary,
            },
            textStyle,
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initialText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
