import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSync } from '../lib/useSync';

export function SyncHeader() {
  const { isSyncing } = useSync();

  if (!isSyncing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#4F46E5" />
      <Text style={styles.text}>Syncing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 6,
  },
  text: {
    fontSize: 12,
    color: '#6B7280',
  },
});
