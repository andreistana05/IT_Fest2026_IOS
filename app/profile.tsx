import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';

export default function ProfileScreen() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!mounted) return;
        setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.warn('Failed to load profile', e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (authLoading) return <ActivityIndicator style={styles.center} />;

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Not signed in</Text>
        <Text style={styles.text}>Please sign in or register to view your profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>UID</Text>
          <Text style={styles.value}>{profile?.uid ?? user.uid}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email ?? user.email}</Text>

          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{profile?.name ?? user.displayName ?? '-'}</Text>

          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{profile?.phone ?? '-'}</Text>

          <Text style={styles.label}>FCM Token</Text>
          <Text style={styles.value}>{profile?.fcmToken ?? '-'}</Text>

          <Text style={styles.label}>Created At</Text>
          <Text style={styles.value}>{formatTimestamp(profile?.createdAt)}</Text>
        </View>
      )}

      <Button title="Refresh" onPress={() => { if (user) { setProfile(null); /* trigger reload via effect */ } }} />
      <View style={{ height: 12 }} />
      <Button title="Sign out" onPress={() => signOutUser()} />
    </ScrollView>
  );
}

function formatTimestamp(t: any) {
  if (!t) return '-';
  // Firestore serverTimestamp may be a Timestamp object
  if (t?.toDate) {
    return t.toDate().toLocaleString();
  }
  // If it's an object with seconds
  if (typeof t === 'object' && typeof t.seconds === 'number') {
    return new Date(t.seconds * 1000).toLocaleString();
  }
  // If it's numeric milliseconds
  if (typeof t === 'number') {
    return new Date(t).toLocaleString();
  }
  return String(t);
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#f7f7f7', padding: 16, borderRadius: 8, marginBottom: 12 },
  label: { fontSize: 12, color: '#666', marginTop: 8 },
  value: { fontSize: 16, color: '#111' },
  text: { fontSize: 16 },
});
