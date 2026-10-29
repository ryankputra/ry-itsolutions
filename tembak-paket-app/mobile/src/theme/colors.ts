/**
 * Premium Modern Color Palette
 * Syncs with web design tokens (Zinc dark mode & vibrant accents)
 */

export const Colors = {
  dark: {
    background: '#000000',
    canvas: '#000000',
    surface: '#161617',
    parchment: '#161617',
    surfaceElevated: '#1c1c1e',
    surfaceTile: '#2c2c2e',
    surfacePearl: '#1c1c1e',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: '#2d2d2f',
    hairline: 'rgba(255, 255, 255, 0.08)',
    divider: '#2d2d2f',
    
    text: '#f5f5f7',
    ink: '#f5f5f7',
    textMuted: '#86868b',
    inkMuted: '#86868b',
    textDim: '#636366',
    
    primary: '#2997ff',
    primaryHover: '#52a9ff',
    primaryFocus: '#0071e3',
    
    spotify: '#1ed760',
    spotifyDark: '#169c46',
    
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    info: '#64D2FF',
    purple: '#BF5AF2',
    indigo: '#5E5CE6',
    pink: '#FF375F',
    teal: '#40C8E0',
    
    cardBg: '#161617',
    inputBg: '#1c1c1e',
    searchBg: '#2c2c2e',
    ripple: 'rgba(255, 255, 255, 0.08)',
  },
  light: {
    background: '#f5f5f7',
    canvas: '#f5f5f7',
    surface: '#ffffff',
    parchment: '#ffffff',
    surfaceElevated: '#ffffff',
    surfaceTile: '#1d1d1f',
    surfacePearl: '#f5f5f7',
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: '#e5e5ea',
    hairline: 'rgba(0, 0, 0, 0.08)',
    divider: '#e5e5ea',
    
    text: '#1d1d1f',
    ink: '#1d1d1f',
    textMuted: '#86868b',
    inkMuted: '#86868b',
    textDim: '#8e8e93',
    
    primary: '#0071e3',
    primaryHover: '#0077ed',
    primaryFocus: '#0055c6',
    
    spotify: '#1ed760',
    spotifyDark: '#169c46',
    
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#30B0C7',
    purple: '#AF52DE',
    indigo: '#5856D6',
    pink: '#FF2D55',
    teal: '#30B0C7',
    
    cardBg: '#ffffff',
    inputBg: '#ffffff',
    searchBg: '#e8e8ed',
    ripple: 'rgba(0, 0, 0, 0.06)',
  },
};

export type ThemeColors = typeof Colors.dark;
