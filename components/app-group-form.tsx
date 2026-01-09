import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { AppGroup } from '@/types/app-group';
import { IOSActivityPicker } from './ios-activity-picker';

interface AppGroupFormProps {
  group?: AppGroup;
  onSave: (group: AppGroup) => void;
  onCancel: () => void;
  onSelectApps: () => Promise<string[]>;
}

export function AppGroupForm({ group, onSave, onCancel, onSelectApps }: AppGroupFormProps) {
  const [name, setName] = useState(group?.name || '');
  const [apps, setApps] = useState<string[]>(group?.apps || []);
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectApps = () => {
    setShowPicker(true);
  };

  const handlePickerSelect = async (selectedAppIds: string[]) => {
    setApps(selectedAppIds);
    setShowPicker(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (apps.length === 0) {
      Alert.alert('Error', 'Please select at least one app');
      return;
    }

    const newGroup: AppGroup = {
      id: group?.id || Date.now().toString(),
      name: name.trim(),
      apps,
      createdAt: group?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onSave(newGroup);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">{group ? 'Edit Group' : 'New Group'}</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.label}>Group Name</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter group name"
            placeholderTextColor={Colors.dark.icon}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.label}>Apps</ThemedText>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleSelectApps}
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
            <ThemedText style={styles.emptyText}>No apps selected</ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, (!name.trim() || apps.length === 0) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || apps.length === 0}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
});

