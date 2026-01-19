import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ScheduleForm } from '@/components/schedule-form';
import { BlockerSchedule } from '@/types/blocker';
import { useBlocker } from '@/contexts/blocker-context';

export default function ModalScreen() {
  const { type, scheduleId } = useLocalSearchParams<{ type: string; scheduleId?: string }>();
  const router = useRouter();
  const { addSchedule, updateSchedule, schedules } = useBlocker();

  const handleSaveSchedule = async (schedule: BlockerSchedule) => {
    console.log('[DETOX] modal.handleSaveSchedule:', schedule.id);
    
    if (scheduleId && schedules.find((s) => s.id === scheduleId)) {
      await updateSchedule(scheduleId, schedule);
    } else {
      // Only allow one schedule - if one exists, update it instead of adding new
      if (schedules.length > 0) {
        await updateSchedule(schedules[0].id, schedule);
      } else {
        await addSchedule(schedule);
      }
    }
    router.back();
  };

  if (type === 'schedule') {
    const existingSchedule = scheduleId ? schedules.find((s) => s.id === scheduleId) : undefined;
    return (
      <ThemedView style={styles.container}>
        <ScheduleForm 
          schedule={existingSchedule} 
          onSave={handleSaveSchedule} 
          onCancel={() => router.back()} 
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
