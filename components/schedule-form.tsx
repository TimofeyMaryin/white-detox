/**
 * Schedule Form Component
 *
 * Form for creating and editing blocking schedules.
 * Time and days are UI-only (no automatic scheduling).
 *
 * @module components/schedule-form
 */

import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Colors } from '@/constants/theme';
import { BlockerSchedule, DAY_NAMES_FULL } from '@/types/blocker';
import { IOSActivityPicker } from './ios-activity-picker';
import { SelectedAppsIcons } from './selected-apps-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

interface ScheduleFormProps {
  schedule?: BlockerSchedule;
  onSave: (schedule: BlockerSchedule) => void;
  onCancel: () => void;
}

function timeStringToDate(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function ScheduleForm({ schedule, onSave, onCancel }: ScheduleFormProps) {
  const [startTime, setStartTime] = useState(schedule?.startTime || '09:00');
  const [endTime, setEndTime] = useState(schedule?.endTime || '17:00');
  const [selectedDays, setSelectedDays] = useState<number[]>(schedule?.daysOfWeek || []);
  const [isActive] = useState(schedule?.isActive ?? true);
  const [showPicker, setShowPicker] = useState(false);
  
  // If editing, mark as having apps selected (since we can't query the native selection)
  const isEditing = Boolean(schedule?.familyActivitySelectionId);
  const [selectionInfo, setSelectionInfo] = useState({
    applicationCount: isEditing ? 1 : 0, // Assume apps are selected if editing
    categoryCount: 0,
  });
  const [hasModifiedSelection, setHasModifiedSelection] = useState(false);
  
  const [scheduleId] = useState(() => schedule?.id || `schedule_${Date.now()}`);
  
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(timeStringToDate(startTime));
  const [tempEndTime, setTempEndTime] = useState(timeStringToDate(endTime));

  const handleStartTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      if (selectedDate) {
        setStartTime(dateToTimeString(selectedDate));
      }
    } else {
      if (selectedDate) {
        setTempStartTime(selectedDate);
      }
    }
  };

  const handleEndTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
      if (selectedDate) {
        setEndTime(dateToTimeString(selectedDate));
      }
    } else {
      if (selectedDate) {
        setTempEndTime(selectedDate);
      }
    }
  };

  const confirmStartTime = () => {
    setStartTime(dateToTimeString(tempStartTime));
    setShowStartTimePicker(false);
  };

  const confirmEndTime = () => {
    setEndTime(dateToTimeString(tempEndTime));
    setShowEndTimePicker(false);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const handleSelectApps = () => {
    setShowPicker(true);
  };

  const handleSelectionChange = (metadata: { applicationCount: number; categoryCount: number }) => {
    setSelectionInfo(metadata);
    setHasModifiedSelection(true);
  };

  // For editing: if selection wasn't modified, trust that apps exist; otherwise check new selection
  const hasAppsSelected = isEditing && !hasModifiedSelection 
    ? true 
    : selectionInfo.applicationCount > 0 || selectionInfo.categoryCount > 0;

  const handleSave = () => {
    if (!hasAppsSelected) {
      Alert.alert('Error', 'Please select at least one app to block');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    const newSchedule: BlockerSchedule = {
      id: scheduleId,
      name: '', // Not displayed, kept for compatibility
      startTime,
      endTime,
      daysOfWeek: selectedDays,
      isActive,
      familyActivitySelectionId: scheduleId,
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
          <ThemedText style={styles.label}>Start Time</ThemedText>
          <TouchableOpacity
            style={styles.timeInput}
            onPress={() => {
              setTempStartTime(timeStringToDate(startTime));
              setShowStartTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.timeInputText}>{startTime}</ThemedText>
            <IconSymbol name="clock.fill" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>End Time</ThemedText>
          <TouchableOpacity
            style={styles.timeInput}
            onPress={() => {
              setTempEndTime(timeStringToDate(endTime));
              setShowEndTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.timeInputText}>{endTime}</ThemedText>
            <IconSymbol name="clock.fill" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>Days of Week</ThemedText>
          <View style={styles.daysContainer}>
            {DAY_NAMES_FULL.map((day, index) => (
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
              onPress={handleSelectApps}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={Colors.dark.primary} />
              <ThemedText style={styles.selectButtonText}>
                {hasAppsSelected ? 'Change Selection' : 'Select Apps'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {hasAppsSelected ? (
            <View style={styles.selectedInfo}>
              <SelectedAppsIcons
                familyActivitySelectionId={scheduleId}
                iconSize={40}
                maxIcons={6}
                height={48}
              />
              <ThemedText style={styles.selectedInfoText}>
                {selectionInfo.applicationCount} apps, {selectionInfo.categoryCount} categories
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>
              No apps selected. Tap "Select Apps" to choose apps to block.
            </ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.saveButton, 
              (!hasAppsSelected || selectedDays.length === 0) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!hasAppsSelected || selectedDays.length === 0}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <IOSActivityPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectionChange={handleSelectionChange}
        familyActivitySelectionId={scheduleId}
      />

      {/* Start Time Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showStartTimePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                  <ThemedText style={styles.pickerCancelButton}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.pickerTitle}>Start Time</ThemedText>
                <TouchableOpacity onPress={confirmStartTime}>
                  <ThemedText style={styles.pickerDoneButton}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempStartTime}
                  mode="time"
                  display="spinner"
                  onChange={handleStartTimeChange}
                  textColor={Colors.dark.text}
                  style={styles.picker}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showStartTimePicker && (
          <DateTimePicker
            value={timeStringToDate(startTime)}
            mode="time"
            is24Hour
            onChange={handleStartTimeChange}
          />
        )
      )}

      {/* End Time Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showEndTimePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <ThemedText style={styles.pickerCancelButton}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.pickerTitle}>End Time</ThemedText>
                <TouchableOpacity onPress={confirmEndTime}>
                  <ThemedText style={styles.pickerDoneButton}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempEndTime}
                  mode="time"
                  display="spinner"
                  onChange={handleEndTimeChange}
                  textColor={Colors.dark.text}
                  style={styles.picker}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showEndTimePicker && (
          <DateTimePicker
            value={timeStringToDate(endTime)}
            mode="time"
            is24Hour
            onChange={handleEndTimeChange}
          />
        )
      )}
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
  selectedInfo: {
    flexDirection: 'column',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 235, 63, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 235, 63, 0.3)',
  },
  selectedInfoText: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.dark.primary,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  timeInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInputText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerCancelButton: {
    fontSize: 17,
    color: Colors.dark.icon,
  },
  pickerDoneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  picker: {
    height: 200,
    width: '100%',
    alignSelf: 'center',
  },
  pickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
