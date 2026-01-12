import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { AppGroupForm } from '@/components/app-group-form';
import { ScheduleForm } from '@/components/schedule-form';
import { AppGroup } from '@/types/app-group';
import { BlockerSchedule } from '@/types/blocker';
import { useBlocker } from '@/hooks/use-blocker';
import ScreenTimeModule from '@/modules/screen-time';
import { Alert } from 'react-native';

export default function ModalScreen() {
  const { type, scheduleId, groupId } = useLocalSearchParams<{ type: string; scheduleId?: string; groupId?: string }>();
  const router = useRouter();
  const { addSchedule, updateSchedule, schedules } = useBlocker();

  const handleSaveSchedule = (schedule: BlockerSchedule) => {
    if (scheduleId && schedules.find((s) => s.id === scheduleId)) {
      updateSchedule(scheduleId, schedule);
    } else {
      // Only allow one schedule - if one exists, update it instead of adding new
      if (schedules.length > 0) {
        updateSchedule(schedules[0].id, schedule);
      } else {
        addSchedule(schedule);
      }
    }
    router.back();
  };

  const handleSaveGroup = (group: AppGroup) => {
    // App groups are now integrated into schedules
    // This is kept for backward compatibility but schedules should be used instead
    router.back();
  };

  if (type === 'schedule') {
    const existingSchedule = scheduleId ? schedules.find((s) => s.id === scheduleId) : undefined;
    return (
      <ThemedView style={styles.container}>
        <ScheduleForm schedule={existingSchedule} onSave={handleSaveSchedule} onCancel={() => router.back()} />
      </ThemedView>
    );
  }

  if (type === 'apps' || type === 'app-group') {
    return (
      <ThemedView style={styles.container}>
        <AppGroupForm
          onSave={handleSaveGroup}
          onCancel={() => router.back()}
          onSelectApps={handleSelectApps}
        />
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
