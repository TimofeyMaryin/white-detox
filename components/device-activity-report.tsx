import React from 'react';
import { Platform, requireNativeComponent, View, StyleSheet, ViewStyle } from 'react-native';

interface DeviceActivityReportProps {
  periodType?: 'day' | 'week' | 'month';
  style?: ViewStyle;
}

const NativeDeviceActivityReport = Platform.OS === 'ios' 
  ? requireNativeComponent<{ periodType: string; style?: ViewStyle }>('DeviceActivityReportView')
  : null;

/**
 * DeviceActivityReport component
 * 
 * Renders the native iOS DeviceActivityReport view which triggers
 * the DeviceActivityReportExtension to fetch and save Screen Time data.
 * 
 * IMPORTANT: This component must be rendered for the extension to be called
 * by iOS and for Screen Time data to be populated in UserDefaults.
 */
export function DeviceActivityReport({ periodType = 'day', style }: DeviceActivityReportProps) {
  if (Platform.OS !== 'ios' || !NativeDeviceActivityReport) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <NativeDeviceActivityReport
      periodType={periodType}
      style={[styles.container, style]}
    />
  );
}

/**
 * Hidden DeviceActivityReport - triggers extension without visible UI
 */
export function HiddenDeviceActivityReport({ periodType = 'day' }: { periodType?: 'day' | 'week' | 'month' }) {
  return (
    <View style={styles.hidden}>
      <DeviceActivityReport periodType={periodType} style={styles.hiddenReport} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
  },
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  hiddenReport: {
    width: 1,
    height: 1,
  },
});

export default DeviceActivityReport;
