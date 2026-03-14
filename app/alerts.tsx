import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';

export type FallAlert = {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  message: string | null;
  receivedAt: number;
};

export default function AlertsScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FallAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'users', user.uid, 'alerts');
    const q = query(col, orderBy('receivedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const items: FallAlert[] = [];
      snap.forEach(d => items.push({ id: d.id, ...(d.data() as any) }));
      setAlerts(items);
      setLoading(false);
    }, e => {
      console.warn('alerts snapshot error', e);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'alerts', id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete alert');
    }
  }

  function confirmClearAll() {
    Alert.alert(
      'Clear all alerts',
      'This will permanently remove all alert history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all', style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(alerts.map(a => deleteDoc(doc(db, 'users', user!.uid, 'alerts', a.id))));
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to clear alerts');
            }
          }
        }
      ]
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Not signed in</Text>
        <Text style={styles.emptyHint}>Please sign in to view your alert history.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Alert History</Text>
          <Text style={styles.subtitle}>Fall alerts received from monitored contacts</Text>
        </View>
        {alerts.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={confirmClearAll}>
            <Text style={styles.clearButtonText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.emptyHint}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => <AlertCard alert={item} onDelete={() => handleDelete(item.id)} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptyHint}>
                When a monitored contact's device detects a fall, the alert will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function AlertCard({ alert, onDelete }: { alert: FallAlert; onDelete: () => void }) {
  const time = new Date(alert.receivedAt);
  const isToday = new Date().toDateString() === time.toDateString();
  const dateStr = isToday
    ? `Today at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const initials = (alert.contactName || alert.contactPhone || '?')[0].toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.alertIcon}>
          <Text style={styles.alertIconText}>{initials}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName}>{alert.contactName ?? alert.contactPhone ?? 'Unknown contact'}</Text>
          <Text style={styles.cardBadge}>FALL DETECTED</Text>
        </View>
        {alert.contactPhone && alert.contactName && (
          <Text style={styles.cardPhone}>{alert.contactPhone}</Text>
        )}
        {alert.message ? (
          <Text style={styles.cardMessage}>{alert.message}</Text>
        ) : null}
        <Text style={styles.cardTime}>{dateStr}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// Helper to save an incoming alert to Firestore — imported by index.tsx
export async function saveAlert(uid: string, data: Omit<FallAlert, 'id'>) {
  const col = collection(db, 'users', uid, 'alerts');
  await addDoc(col, data);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20, paddingTop: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#2c3e50' },
  subtitle: { fontSize: 13, color: '#7f8c8d', marginTop: 3 },
  clearButton: { backgroundColor: '#fdecea', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, marginTop: 4 },
  clearButtonText: { color: '#e74c3c', fontWeight: '600', fontSize: 13 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#2c3e50', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#95a5a6', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
  cardLeft: { marginRight: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fdecea', alignItems: 'center', justifyContent: 'center' },
  alertIconText: { fontSize: 16, fontWeight: '700', color: '#e74c3c' },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#2c3e50', flex: 1, marginRight: 8 },
  cardBadge: { backgroundColor: '#fdecea', color: '#e74c3c', fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, letterSpacing: 0.5 },
  cardPhone: { fontSize: 13, color: '#7f8c8d', marginBottom: 3 },
  cardMessage: { fontSize: 13, color: '#555', marginBottom: 4 },
  cardTime: { fontSize: 12, color: '#95a5a6' },
  deleteButton: { padding: 6, marginLeft: 4 },
  deleteText: { color: '#bdc3c7', fontSize: 16, fontWeight: '700' },
});
