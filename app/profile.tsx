import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from './lib/auth';
import { auth, db, saveUserProfile } from './lib/firebase';

export default function ProfileScreen() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editing, setEditing] = useState(false);

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
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // Registration write never reached Firestore — seed it now from Auth data
          const seed = await saveUserProfile({ uid: user.uid, email: user.email, name: user.displayName });
          if (mounted) setProfile(seed);
        }
      } catch (e) {
        console.warn('Failed to load profile', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  async function saveEdits() {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const updates = { name: editName.trim() || null, phone: editPhone.trim() || null };
      if (snap.exists()) {
        await updateDoc(ref, updates);
      } else {
        await saveUserProfile({ uid: user.uid, email: user.email, name: updates.name, phone: updates.phone });
      }
      if (editName.trim()) await updateProfile(auth.currentUser!, { displayName: editName.trim() });
      setProfile((p: any) => ({ ...(p || {}), ...updates }));
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <ActivityIndicator style={styles.center} />;

  if (!user) {
    return (
      <View style={styles.notSignedIn}>
        <Text style={styles.notSignedInTitle}>Not signed in</Text>
        <Text style={styles.notSignedInText}>Please sign in or register to view your profile.</Text>
      </View>
    );
  }

  const initials = (profile?.name || user.displayName || 'U')
    .split(' ')
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Your Profile</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>

          {/* Info card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Account details</Text>
              {!editing && (
                <TouchableOpacity onPress={() => { setEditName(profile?.name ?? user.displayName ?? ''); setEditPhone(profile?.phone ?? ''); setEditing(true); }}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Full name</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#bbb"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.name ?? user.displayName ?? '—'}</Text>
              )}
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <Text style={styles.fieldValue}>{profile?.email ?? user.email}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone number</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="e.g. +40712345678"
                  placeholderTextColor="#bbb"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.phone ?? '—'}</Text>
              )}
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Member since</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(profile?.createdAt)}</Text>
            </View>

            {editing && (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveEdits} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutButton} onPress={() => signOutUser()}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function formatTimestamp(t: any) {
  if (!t) return '—';
  if (t?.toDate) return t.toDate().toLocaleString();
  if (typeof t === 'object' && typeof t.seconds === 'number') return new Date(t.seconds * 1000).toLocaleString();
  if (typeof t === 'number') return new Date(t).toLocaleString();
  return String(t);
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 20 },
  notSignedIn: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  notSignedInTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  notSignedInText: { fontSize: 15, color: '#999', textAlign: 'center' },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#e8e8e8' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 },
  editLink: { fontSize: 14, fontWeight: '600', color: '#111' },

  fieldRow: { paddingVertical: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  fieldValue: { fontSize: 16, color: '#111', fontWeight: '500' },
  fieldInput: { fontSize: 16, color: '#111', fontWeight: '500', borderBottomWidth: 1.5, borderBottomColor: '#111', paddingVertical: 4 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: { flex: 1, padding: 13, borderRadius: 10, borderWidth: 1.5, borderColor: '#111', alignItems: 'center' },
  cancelText: { color: '#111', fontWeight: '600', fontSize: 15 },
  saveButton: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#111', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  signOutButton: { padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#111', alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#111', fontWeight: '700', fontSize: 16 },
});
