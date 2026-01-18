import { Colors } from '@/constants/theme';
import FamilyActivityPickerModule from '@/modules/family-activity-picker';
import { BlockerSchedule } from '@/types/blocker';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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

// Helper to convert "HH:mm" string to Date object
const timeStringToDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

// Helper to convert Date object to "HH:mm" string
const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export function ScheduleForm({ schedule, onSave, onCancel }: ScheduleFormProps) {
  console.log('[DETOX_DEBUG] ScheduleForm: Component rendering');
  console.log('[DETOX_DEBUG] ScheduleForm: schedule prop:', JSON.stringify(schedule, null, 2));
  
  const [name, setName] = useState(schedule?.name || '');
  const [startTime, setStartTime] = useState(schedule?.startTime || '09:00');
  const [endTime, setEndTime] = useState(schedule?.endTime || '17:00');
  const [selectedDays, setSelectedDays] = useState<number[]>(schedule?.daysOfWeek || []);
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);
  const [apps, setApps] = useState<string[]>(schedule?.apps || []);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [tokensLost, setTokensLost] = useState(false);
  
  // Generate a stable ID for new schedules (used for saving selection)
  const [scheduleId] = useState(() => {
    const id = schedule?.id || Date.now().toString();
    console.log('[DETOX_DEBUG] ScheduleForm: Generated/using scheduleId:', id);
    return id;
  });
  
  console.log('[DETOX_DEBUG] ScheduleForm: Initial state - name:', name, 'apps count:', apps.length, 'days:', selectedDays);
  
  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(timeStringToDate(startTime));
  const [tempEndTime, setTempEndTime] = useState(timeStringToDate(endTime));
  
  // Load saved selection when editing an existing schedule
  useEffect(() => {
    const loadSavedSelection = async () => {
      if (schedule?.id && schedule.apps.length > 0) {
        setIsLoadingApps(true);
        try {
          // Try to load saved selection from native module
          // This restores the globalActivitySelection for blocking to work
          const savedApps = await FamilyActivityPickerModule.loadSavedSelectionForScheduleId(schedule.id);
          if (savedApps && savedApps.length > 0) {
            // Tokens are available
            console.log('Restored native selection for schedule:', schedule.id, savedApps);
            setTokensLost(false);
          } else {
            // Tokens were lost after app restart
            console.log('Tokens lost for schedule:', schedule.id);
            setTokensLost(true);
          }
        } catch (error) {
          console.error('Error loading saved selection:', error);
          setTokensLost(true);
        } finally {
          setIsLoadingApps(false);
        }
      }
    };
    
    loadSavedSelection();
  }, [schedule?.id, schedule?.apps.length]);

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
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

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
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

  const handleSelectApps = async () => {
    // Always try to show picker - it will handle authorization internally
    // The picker will request authorization if needed and show itself
    setShowPicker(true);
  };

  const handlePickerSelect = (selectedAppIds: string[]) => {
    console.log('[DETOX_DEBUG] ScheduleForm.handlePickerSelect: Received apps:', selectedAppIds);
    setApps(selectedAppIds);
    setShowPicker(false);
    // Reset tokensLost flag since user just selected new apps
    if (selectedAppIds.length > 0) {
      setTokensLost(false);
    }
  };
  
  // Handle removing an app from the list
  // Due to iOS limitations (Set doesn't guarantee order), we can't reliably remove individual tokens
  // Instead, we clear the selection and ask user to re-select apps
  const handleRemoveApp = async (indexToRemove: number) => {
    Alert.alert(
      'Remove App',
      'Due to iOS limitations, removing individual apps requires re-selecting all apps. Do you want to clear the selection and choose apps again?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Re-select',
          style: 'destructive',
          onPress: async () => {
            // Clear all apps
            setApps([]);
            
            // Clear native selection
            try {
              if (FamilyActivityPickerModule && typeof FamilyActivityPickerModule.clearSelectionForScheduleId === 'function') {
                await FamilyActivityPickerModule.clearSelectionForScheduleId(scheduleId);
              }
            } catch (error) {
              console.error('Error clearing selection:', error);
            }
            
            // Open picker to re-select
            setTimeout(() => {
              setShowPicker(true);
            }, 300);
          },
        },
      ]
    );
  };

  const handleSave = () => {
    console.log('[DETOX_DEBUG] ScheduleForm.handleSave: Called');
    console.log('[DETOX_DEBUG] ScheduleForm.handleSave: Current state - name:', name, 'apps:', apps.length, 'days:', selectedDays.length);
    
    if (!name.trim()) {
      console.log('[DETOX_DEBUG] ScheduleForm.handleSave: Validation failed - no name');
      Alert.alert('Error', 'Please enter a schedule name');
      return;
    }
    if (apps.length === 0) {
      console.log('[DETOX_DEBUG] ScheduleForm.handleSave: Validation failed - no apps');
      Alert.alert('Error', 'Please select at least one app to block');
      return;
    }
    if (selectedDays.length === 0) {
      console.log('[DETOX_DEBUG] ScheduleForm.handleSave: Validation failed - no days');
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    const newSchedule: BlockerSchedule = {
      id: scheduleId, // Use the stable scheduleId
      name: name.trim(),
      startTime,
      endTime,
      daysOfWeek: selectedDays,
      isActive,
      apps,
    };

    console.log('[DETOX_DEBUG] ScheduleForm.handleSave: Creating schedule:', JSON.stringify(newSchedule, null, 2));
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
              <ThemedText style={styles.selectButtonText}>{tokensLost ? 'Re-select Apps' : 'Select Apps'}</ThemedText>
            </TouchableOpacity>
          </View>
          
          {/* Warning when tokens are lost after app restart */}
          {tokensLost && apps.length > 0 && (
            <View style={styles.warningBox}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF9500" />
              <ThemedText style={styles.warningText}>
                App tokens were lost after restart. Please tap "Re-select Apps" to restore blocking functionality.
              </ThemedText>
            </View>
          )}
          
          {apps.length > 0 ? (
            <View style={styles.appsList}>
              {apps.map((appId, index) => (
                <View key={index} style={[styles.appItem, tokensLost && styles.appItemWarning]}>
                  <ThemedText style={styles.appName}>
                    {appId.startsWith('app_') ? `App ${parseInt(appId.replace('app_', '')) + 1}` : 
                     appId.startsWith('category_') ? `Category ${parseInt(appId.replace('category_', '')) + 1}` : appId}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => handleRemoveApp(index)}
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
        scheduleId={scheduleId}
      />

      {/* Start Time Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showStartTimePicker}
          transparent
          animationType="slide"
        >
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
        <Modal
          visible={showEndTimePicker}
          transparent
          animationType="slide"
        >
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9500',
    lineHeight: 18,
  },
  appItemWarning: {
    borderColor: 'rgba(255, 149, 0, 0.5)',
    opacity: 0.7,
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

