import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { AppGroup } from '@/types/app-group';

interface AppGroupListProps {
  groups: AppGroup[];
  onGroupPress: (group: AppGroup) => void;
  onAddPress: () => void;
  onDeletePress: (groupId: string) => void;
}

export function AppGroupList({ groups, onGroupPress, onAddPress, onDeletePress }: AppGroupListProps) {
  if (groups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No app groups yet</ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
          <IconSymbol name="plus.circle.fill" size={24} color={Colors.dark.primary} />
          <ThemedText style={styles.addButtonText}>Create Group</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {groups.map((group) => (
        <TouchableOpacity
          key={group.id}
          style={styles.groupItem}
          onPress={() => onGroupPress(group)}
        >
          <View style={styles.groupInfo}>
            <ThemedText style={styles.groupName}>{group.name}</ThemedText>
            <ThemedText style={styles.groupAppsCount}>
              {group.apps.length} {group.apps.length === 1 ? 'app' : 'apps'}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              onDeletePress(group.id);
            }}
          >
            <IconSymbol name="trash.fill" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.addGroupButton} onPress={onAddPress}>
        <IconSymbol name="plus.circle.fill" size={24} color={Colors.dark.primary} />
        <ThemedText style={styles.addGroupText}>Add Group</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupAppsCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 8,
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderStyle: 'dashed',
  },
  addGroupText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
});

