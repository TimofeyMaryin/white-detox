import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { AppGroupForm } from '@/components/app-group-form';
import { ScheduleForm } from '@/components/schedule-form';
import { AppGroup } from '@/types/app-group';
import { BlockerSchedule } from '@/types/blocker';
import { useBlocker } from '@/contexts/blocker-context';
import ScreenTimeModule from '@/modules/screen-time';
import { Alert } from 'react-native';

export default function ModalScreen() {
  const { type, scheduleId, groupId } = useLocalSearchParams<{ type: string; scheduleId?: string; groupId?: string }>();
  const router = useRouter();
  const { addSchedule, updateSchedule, schedules } = useBlocker();

  const handleSaveSchedule = async (schedule: BlockerSchedule) => {
    console.log('[DETOX_DEBUG] modal.handleSaveSchedule: Called');
    console.log('[DETOX_DEBUG] modal.handleSaveSchedule: scheduleId param:', scheduleId);
    console.log('[DETOX_DEBUG] modal.handleSaveSchedule: schedule to save:', JSON.stringify(schedule, null, 2));
    console.log('[DETOX_DEBUG] modal.handleSaveSchedule: current schedules count:', schedules.length);
    
    if (scheduleId && schedules.find((s) => s.id === scheduleId)) {
      console.log('[DETOX_DEBUG] modal.handleSaveSchedule: Updating existing schedule with id:', scheduleId);
      await updateSchedule(scheduleId, schedule);
    } else {
      // Only allow one schedule - if one exists, update it instead of adding new
      if (schedules.length > 0) {
        console.log('[DETOX_DEBUG] modal.handleSaveSchedule: Updating first schedule (one schedule limit)');
        await updateSchedule(schedules[0].id, schedule);
      } else {
        console.log('[DETOX_DEBUG] modal.handleSaveSchedule: Adding new schedule');
        await addSchedule(schedule);
      }
    }
    console.log('[DETOX_DEBUG] modal.handleSaveSchedule: Save completed, navigating back');
    router.back();
  };

  const handleSaveGroup = (group: AppGroup) => {
    // App groups are now integrated into schedules
    // This is kept for backward compatibility but schedules should be used instead
    router.back();
  };

  if (type === 'schedule') {
    const existingSchedule = scheduleId ? schedules.find((s) => s.id === scheduleId) : undefined;
    console.log('[DETOX_DEBUG] modal: Rendering ScheduleForm');
    console.log('[DETOX_DEBUG] modal: scheduleId param:', scheduleId);
    console.log('[DETOX_DEBUG] modal: existingSchedule found:', !!existingSchedule);
    console.log('[DETOX_DEBUG] modal: existingSchedule:', JSON.stringify(existingSchedule, null, 2));
    console.log('[DETOX_DEBUG] modal: total schedules in context:', schedules.length);
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
