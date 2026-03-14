import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';

type FallAlertWithLocation = {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  message: string | null;
  receivedAt: number;
  latitude: number;
  longitude: number;
};

const INITIAL_REGION: Region = {
  latitude: 45.9432,
  longitude: 24.9668,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function FallMapScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FallAlertWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FallAlertWithLocation | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const col = collection(db, 'users', user.uid, 'alerts');
    const q = query(col, orderBy('receivedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const items: FallAlertWithLocation[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          items.push({ id: d.id, ...data });
        }
      });
      setAlerts(items);
      setLoading(false);
    }, e => {
      console.warn('fall-map snapshot error', e);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  function formatTime(ts: number) {
    const d = new Date(ts);
    const isToday = new Date().toDateString() === d.toDateString();
    return isToday
      ? `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function focusMarker(alert: FallAlertWithLocation) {
    setSelected(alert);
    mapRef.current?.animateToRegion({
      latitude: alert.latitude,
      longitude: alert.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  }

  function fitAll() {
    if (alerts.length === 0) return;
    mapRef.current?.fitToCoordinates(
      alerts.map(a => ({ latitude: a.latitude, longitude: a.longitude })),
      { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
    );
    setSelected(null);
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Not signed in</Text>
        <Text style={styles.emptyHint}>Please sign in to view the fall map.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.emptyHint}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsCompass
      >
        {alerts.map(alert => (
          <Marker
            key={alert.id}
            coordinate={{ latitude: alert.latitude, longitude: alert.longitude }}
            pinColor="#e74c3c"
            onPress={() => setSelected(alert)}
          >
            <Callout tooltip onPress={() => focusMarker(alert)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>
                  {alert.contactName ?? alert.contactPhone ?? 'Unknown'}
                </Text>
                <Text style={styles.calloutBadge}>FALL DETECTED</Text>
                <Text style={styles.calloutTime}>{formatTime(alert.receivedAt)}</Text>
                {alert.message ? (
                  <Text style={styles.calloutMessage}>{alert.message}</Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Top controls */}
      <View style={styles.topBar}>
        <View style={styles.countPill}>
          <Text style={styles.countText}>
            {alerts.length === 0
              ? 'No located alerts'
              : `${alerts.length} fall${alerts.length !== 1 ? 's' : ''} on map`}
          </Text>
        </View>
        {alerts.length > 1 && (
          <TouchableOpacity style={styles.fitButton} onPress={fitAll}>
            <Text style={styles.fitButtonText}>Show all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected alert card */}
      {selected && (
        <View style={styles.detailCard}>
          <View style={styles.detailLeft}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>
                {(selected.contactName || selected.contactPhone || '?')[0].toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.detailBody}>
            <Text style={styles.detailName}>
              {selected.contactName ?? selected.contactPhone ?? 'Unknown contact'}
            </Text>
            {selected.contactPhone && selected.contactName && (
              <Text style={styles.detailPhone}>{selected.contactPhone}</Text>
            )}
            <Text style={styles.detailTime}>{formatTime(selected.receivedAt)}</Text>
            <Text style={styles.detailCoords}>
              {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeDetail} onPress={() => setSelected(null)}>
            <Text style={styles.closeDetailText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty overlay */}
      {alerts.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No location data yet</Text>
          <Text style={styles.emptyHint}>
            Fall alerts that include GPS coordinates from the Android device will appear as pins on this map.
          </Text>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 24 },
  topBar: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  countText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  fitButton: { backgroundColor: '#3498db', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  fitButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  callout: { backgroundColor: '#fff', borderRadius: 10, padding: 12, width: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  calloutName: { fontWeight: '700', fontSize: 14, color: '#2c3e50', marginBottom: 3 },
  calloutBadge: { color: '#e74c3c', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  calloutTime: { fontSize: 12, color: '#7f8c8d' },
  calloutMessage: { fontSize: 12, color: '#555', marginTop: 4 },
  detailCard: { position: 'absolute', bottom: 32, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
  detailLeft: { marginRight: 12 },
  detailIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fdecea', alignItems: 'center', justifyContent: 'center' },
  detailIconText: { fontSize: 18, fontWeight: '700', color: '#e74c3c' },
  detailBody: { flex: 1 },
  detailName: { fontSize: 15, fontWeight: '700', color: '#2c3e50' },
  detailPhone: { fontSize: 13, color: '#7f8c8d', marginTop: 1 },
  detailTime: { fontSize: 12, color: '#95a5a6', marginTop: 3 },
  detailCoords: { fontSize: 11, color: '#bdc3c7', marginTop: 2 },
  closeDetail: { padding: 6 },
  closeDetailText: { color: '#bdc3c7', fontSize: 18, fontWeight: '700' },
  emptyOverlay: { position: 'absolute', top: '35%', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#2c3e50', marginBottom: 8, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', lineHeight: 20 },
});
