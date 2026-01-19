/**
 * Themed View Component
 *
 * View component that automatically uses theme-appropriate background color.
 *
 * @module components/themed-view
 */

import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  /** Override light mode background color */
  lightColor?: string;
  /** Override dark mode background color */
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
