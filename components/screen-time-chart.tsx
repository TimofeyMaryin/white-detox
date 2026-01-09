import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

interface ChartDataPoint {
  label: string;
  value: number; // in seconds
}

interface ScreenTimeChartProps {
  data: ChartDataPoint[];
  maxValue?: number; // in seconds, if not provided will be calculated
}

export function ScreenTimeChart({ data, maxValue }: ScreenTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.emptyText}>No data available</ThemedText>
      </View>
    );
  }

  // Calculate max value if not provided
  const calculatedMax = maxValue || Math.max(...data.map(d => d.value), 1);
  const maxDisplayValue = Math.ceil(calculatedMax / 3600) * 3600; // Round up to nearest hour

  // Calculate bar heights (0-100%)
  const barHeights = data.map(d => (d.value / maxDisplayValue) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {[3, 2, 1, 0].map((multiplier) => {
            const value = (maxDisplayValue / 3) * multiplier;
            const hours = Math.floor(value / 3600);
            const minutes = Math.floor((value % 3600) / 60);
            return (
              <ThemedText key={multiplier} style={styles.yAxisLabel}>
                {hours > 0 ? `${hours}h` : `${minutes}m`}
              </ThemedText>
            );
          })}
        </View>

        {/* Chart bars */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(barHeights[index], 2)}%`, // Minimum 2% for visibility
                    },
                  ]}
                />
              </View>
              <ThemedText style={styles.xAxisLabel} numberOfLines={1}>
                {item.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontSize: 11,
    opacity: 0.7,
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
    minHeight: 2,
  },
  xAxisLabel: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    padding: 20,
  },
});

