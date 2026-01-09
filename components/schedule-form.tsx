import { Colors } from '@/constants/theme';
import FamilyActivityPickerModule from '@/modules/family-activity-picker/FamilyActivityPickerModule';
import { BlockerSchedule } from '@/types/blocker';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { IOSActivityPicker } from './ios-activity-picker';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

interface ScheduleFormProps {
  schedule?: BlockerSchedule;
  onSave: (schedule: BlockerSchedule) => void;
  onCancel: () => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ScheduleForm({ schedule, onSave, onCancel }: ScheduleFormProps) {
  const [name, setName] = useState(schedule?.name || '');
  const [startTime, setStartTime] = useState(schedule?.startTime || '09:00');
  const [endTime, setEndTime] = useState(schedule?.endTime || '17:00');
  const [selectedDays, setSelectedDays] = useState<number[]>(schedule?.daysOfWeek || []);
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);
  const [apps, setApps] = useState<string[]>(schedule?.apps || []);
  const [showPicker, setShowPicker] = useState(false);

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const handleSelectApps = async () => {
    // Always try to show picker - it will handle authorization internally
    // The picker will request authorization if needed and show itself
    setShowPicker(true);
  };

  const handlePickerSelect = (selectedAppIds: string[]) => {
    setApps(selectedAppIds);
    setShowPicker(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a schedule name');
      return;
    }
    if (apps.length === 0) {
      Alert.alert('Error', 'Please select at least one app to block');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    const newSchedule: BlockerSchedule = {
      id: schedule?.id || Date.now().toString(),
      name: name.trim(),
      startTime,
      endTime,
      daysOfWeek: selectedDays,
      isActive,
      apps,
    };

    onSave(newSchedule);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">{schedule ? 'Edit Schedule' : 'New Schedule'}</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>Name</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Schedule name"
            placeholderTextColor={Colors.dark.icon}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>Start Time</ThemedText>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:mm"
            placeholderTextColor={Colors.dark.icon}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>End Time</ThemedText>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:mm"
            placeholderTextColor={Colors.dark.icon}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>Days of Week</ThemedText>
          <View style={styles.daysContainer}>
            {DAYS.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  selectedDays.includes(index) && styles.dayButtonSelected,
                ]}
                onPress={() => toggleDay(index)}
              >
                <ThemedText
                  style={[
                    styles.dayText,
                    selectedDays.includes(index) && styles.dayTextSelected,
                  ]}
                >
                  {day.substring(0, 3)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.label}>Apps to Block</ThemedText>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                console.log('Select Apps button pressed');
                handleSelectApps();
              }}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={Colors.dark.primary} />
              <ThemedText style={styles.selectButtonText}>Select Apps</ThemedText>
            </TouchableOpacity>
          </View>
          {apps.length > 0 ? (
            <View style={styles.appsList}>
              {apps.map((appId, index) => (
                <View key={index} style={styles.appItem}>
                  <ThemedText style={styles.appName}>{appId}</ThemedText>
                  <TouchableOpacity
                    onPress={() => setApps(apps.filter((_, i) => i !== index))}
                  >
                    <IconSymbol name="xmark.circle.fill" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>No apps selected. Tap "Select Apps" to choose apps to block.</ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, (!name.trim() || apps.length === 0 || selectedDays.length === 0) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || apps.length === 0 || selectedDays.length === 0}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <IOSActivityPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePickerSelect}
        selectedApps={apps}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#000',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  saveButton: {
    backgroundColor: Colors.dark.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  appsList: {
    gap: 8,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  appName: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});

