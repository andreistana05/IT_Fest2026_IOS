import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './lib/auth';
import { db, saveUserProfile, storage } from './lib/firebase';

export default function ProfileScreen() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    try {
      if (!user) {
        alert('You must be signed in to upload a profile picture.');
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        alert('Permission to access photos is required.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      const uri = (res as any).assets ? (res as any).assets[0]?.uri : (res as any).uri;
      if (!uri) return;

      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `profiles/${user.uid}/profile_${Date.now()}.jpg`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, blob);
      const url = await getDownloadURL(sref);

      await saveUserProfile({ uid: user.uid, photoURL: url });
      setProfile((p: any) => ({ ...(p || {}), photoURL: url }));
    } catch (e: any) {
      console.warn('Image upload failed', e);
      const code = e?.code || e?.status || 'unknown';
      const message = e?.message || JSON.stringify(e);
      const server = e?.serverResponse || e?.customData || null;
      alert(`Upload failed: ${code} — ${message}` + (server ? `\nServer: ${JSON.stringify(server)}` : ''));
    } finally {
      setUploading(false);
    }
  }

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
    return () => { mounted = false; };
  }, [user]);

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
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage} disabled={uploading}>
              <Text style={styles.changePhotoText}>{uploading ? 'Uploading...' : 'Change photo'}</Text>
            </TouchableOpacity>
          </View>

          {/* Info card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account details</Text>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <Text style={styles.fieldValue}>{profile?.name ?? user.displayName ?? '—'}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <Text style={styles.fieldValue}>{profile?.email ?? user.email}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone number</Text>
              <Text style={styles.fieldValue}>{profile?.phone ?? '—'}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Member since</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(profile?.createdAt)}</Text>
            </View>
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
  container: { padding: 24, flexGrow: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#2c3e50', marginBottom: 20 },
  notSignedIn: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  notSignedInTitle: { fontSize: 20, fontWeight: '700', color: '#2c3e50', marginBottom: 8 },
  notSignedInText: { fontSize: 15, color: '#7f8c8d', textAlign: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#e1e1e1', marginBottom: 12 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#dfe6e9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#2d3436' },
  changePhotoButton: { backgroundColor: '#3498db', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20 },
  changePhotoText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  fieldRow: { paddingVertical: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  fieldValue: { fontSize: 16, color: '#2c3e50', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#ecf0f1' },
  signOutButton: { backgroundColor: '#e74c3c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
