import { requireNativeViewManager } from 'expo-modules-core';
import { ViewProps } from 'react-native';

export interface AppIconsViewProps extends ViewProps {
  /**
   * ID of the FamilyActivitySelection to display icons for
   */
  familyActivitySelectionId?: string;
  
  /**
   * Size of each icon in points (default: 44)
   */
  iconSize?: number;
  
  /**
   * Maximum number of icons to show (default: 10)
   */
  maxIcons?: number;
}

export const AppIconsView = requireNativeViewManager<AppIconsViewProps>('AppIcons');
