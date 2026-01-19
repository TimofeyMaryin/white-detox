/**
 * Theme Color Hook
 *
 * Returns the appropriate color based on the current theme (light/dark).
 * Supports overriding colors via props.
 *
 * @module hooks/use-theme-color
 * @see https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Get theme-appropriate color
 *
 * @param props - Optional color overrides for each theme
 * @param colorName - Key from Colors constant to use as fallback
 * @returns Resolved color string
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
): string {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
