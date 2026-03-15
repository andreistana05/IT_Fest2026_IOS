import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { saveAlert } from '../alerts';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';

export default function App() {
  const [lastAlert, setLastAlert] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const router = useRouter();
  const { user, signOutUser, loading: authLoading } = useAuth();
  const location = useLocationTracking(user?.uid ?? null);

  async function shareLocation() {
    if (location.latitude == null || location.longitude == null) {
      Alert.alert('Location unavailable', 'Your location has not been acquired yet. Please wait a moment and try again.');
      return;
    }

    const lat = location.latitude;
    const lng = location.longitude;
    const appleMapsUrl = `https://maps.apple.com/?q=${lat},${lng}`;
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

    // Fetch user profile (name, phone, medical info) for SOS message and alert fan-out
    let medicalSection = '';
    let userName: string = user?.email ?? 'Unknown';
    let userPhone: string | null = null;
    if (user) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.name) userName = data.name;
          if (data.phone) userPhone = data.phone;
          const parts: string[] = [];
          if (data.medicalConditions) parts.push(`Medical conditions: ${data.medicalConditions}`);
          if (data.allergies) parts.push(`Allergies: ${data.allergies}`);
          if (data.medication) parts.push(`Medication: ${data.medication}`);
          if (parts.length > 0) medicalSection = `\n\nMedical info:\n${parts.join('\n')}`;
        }
      } catch (_) {}
    }

    const messageText = `I've fallen and I need help! My location:\nApple Maps: ${appleMapsUrl}\nGoogle Maps: ${googleMapsUrl}\nPlease come help me as soon as possible!${medicalSection}`;

    // Fetch contacts so we can open SMS pre-addressed to them
    let phones: string[] = [];
    if (user) {
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'contacts'));
        phones = snap.docs.map(d => (d.data() as any).phone).filter(Boolean);
      } catch (_) {}
    }

    // Save this SOS event to the user's own alert history
    if (user) {
      saveAlert(user.uid, {
        contactName: 'You (SOS sent)',
        contactPhone: null,
        message: messageText,
        receivedAt: Date.now(),
        latitude: lat,
        longitude: lng,
      }).catch(() => {});
    }

    // Fan out alert to followers (people monitoring this user) in Firestore
    if (user && userPhone) {
      try {
        const norm = userPhone.replace(/[^0-9+]/g, '');
        const idxSnap = await getDoc(doc(db, 'phone_index', norm));
        const followers: string[] = idxSnap.exists() ? (idxSnap.data().followers || []) : [];
        await Promise.all(followers.map(followerUid =>
          addDoc(collection(db, 'users', followerUid, 'alerts'), {
            contactName: userName,
            contactPhone: userPhone,
            message: messageText,
            receivedAt: Date.now(),
            latitude: lat,
            longitude: lng,
          }).catch(() => {})
        ));
      } catch (_) {}
    }

    if (phones.length > 0 && await SMS.isAvailableAsync()) {
      for (const phone of phones) {
        await SMS.sendSMSAsync([phone], messageText);
      }
      return;
    }

    // Fallback: native share sheet (user can pick SMS, WhatsApp, etc.)
    Share.share({ message: messageText });
  }

  // Live alert count badge
  useEffect(() => {
    if (!user) { setAlertCount(0); return; }
    const col = collection(db, 'users', user.uid, 'alerts');
    const q = query(col, orderBy('receivedAt', 'desc'));
    const unsub = onSnapshot(q, snap => setAlertCount(snap.size));
    return unsub;
  }, [user]);

  const initials = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appName}>FallDetector</Text>
          <Text style={styles.appTagline}>Fall alert companion</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Alert banner — shown when a fall alert was received */}
        {lastAlert && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerIcon}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.alertBannerTitle}>Fall alert received</Text>
              <Text style={styles.alertBannerTime}>Received at {lastAlert} — check on your contact immediately.</Text>
            </View>
          </View>
        )}

        {/* Status card */}
        <View style={styles.card}>
          <View style={[styles.statusDot, lastAlert ? styles.statusDotAlert : styles.statusDotOk]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Monitoring status</Text>
            <Text style={styles.statusText}>
              {lastAlert ? 'Alert received — action needed' : 'Active — listening for fall alerts'}
            </Text>
          </View>
        </View>

        {/* Location card — shown only when signed in */}
        {user && (
          <View style={styles.card}>
            <View style={[styles.statusDot, location.latitude != null ? styles.statusDotOk : styles.statusDotGray]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Your location</Text>
              {location.error ? (
                <Text style={[styles.statusText, { color: '#e74c3c' }]}>{location.error}</Text>
              ) : location.latitude != null ? (
                <Text style={styles.statusText}>
                  {location.latitude.toFixed(5)}, {location.longitude!.toFixed(5)}
                </Text>
              ) : (
                <Text style={styles.statusText}>Acquiring GPS…</Text>
              )}
            </View>
            <TouchableOpacity style={styles.shareChip} onPress={shareLocation}>
              <Text style={styles.shareChipText}>SOS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.userLabel}>Signed in as</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {authLoading ? 'Loading...' : user?.email ?? 'Not signed in'}
            </Text>
          </View>
          {user && (
            <TouchableOpacity style={styles.profileChip} onPress={() => router.push('/profile')}>
              <Text style={styles.profileChipText}>Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {user ? (
          <>
            {/* How it works */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How FallDetector works</Text>
              <View style={styles.infoStep}>
                <Text style={styles.infoStepNum}>1</Text>
                <Text style={styles.infoStepText}>Your loved one carries their phone, which continuously monitors for falls.</Text>
              </View>
              <View style={styles.infoStep}>
                <Text style={styles.infoStepNum}>2</Text>
                <Text style={styles.infoStepText}>When a fall is detected, an SMS alert is sent to their registered emergency contacts.</Text>
              </View>
              <View style={styles.infoStep}>
                <Text style={styles.infoStepNum}>3</Text>
                <Text style={styles.infoStepText}>Add their phone number in Contacts so you receive alerts the moment they fall.</Text>
              </View>
            </View>

            {/* Quick actions */}
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/contacts')}>
              <Text style={styles.actionText}>Monitored contacts</Text>
              <Text style={styles.actionHint}>Add people whose falls you want to be alerted about</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/alerts')}>
              <View style={styles.actionRow}>
                <Text style={styles.actionText}>Alert history</Text>
                {alertCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{alertCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionHint}>View all past fall alerts received</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/fall-map')}>
              <Text style={styles.actionText}>Fall map</Text>
              <Text style={styles.actionHint}>See where falls occurred on a map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonPrimary} onPress={shareLocation}>
              <Text style={styles.actionTextPrimary}>I fell — alert my contacts</Text>
              <Text style={styles.actionHintPrimary}>Sends an emergency SMS with your location to all your contacts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => signOutUser()}>
              <Text style={styles.actionText}>Sign out</Text>
              <Text style={styles.actionHint}>End your session</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Not signed in — explain the app */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What is FallDetector?</Text>
              <Text style={styles.infoBody}>
                FallDetector alerts you the moment a family member or close friend falls. Their device detects the fall and immediately notifies their emergency contacts — including you.
              </Text>
              <Text style={[styles.infoBody, { marginTop: 8 }]}>
                Sign in or create an account to start monitoring the people you care about.
              </Text>
            </View>

            <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => router.push('/login')}>
              <Text style={styles.actionTextPrimary}>Sign in</Text>
              <Text style={styles.actionHintPrimary}>Access your account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/register')}>
              <Text style={styles.actionText}>Create an account</Text>
              <Text style={styles.actionHint}>Register to start receiving fall alerts</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Layout ────────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  appName: { fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: 0.5 },
  appTagline: { fontSize: 12, color: '#999', marginTop: 2 },
  // ─── Alert banner (keep red — it's an emergency indicator) ─────────────────
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: '#e74c3c' },
  alertBannerIcon: { fontSize: 22 },
  alertBannerTitle: { fontWeight: '700', color: '#c0392b', fontSize: 15 },
  alertBannerTime: { fontSize: 13, color: '#e74c3c', marginTop: 2 },

  // ─── Status / location cards ───────────────────────────────────────────────
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#e8e8e8' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  statusDotOk: { backgroundColor: '#27ae60' },
  statusDotAlert: { backgroundColor: '#e74c3c' },
  statusDotGray: { backgroundColor: '#ccc' },
  statusLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.6 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#111', marginTop: 2 },
  shareChip: { borderWidth: 1.5, borderColor: '#111', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
  shareChipText: { color: '#111', fontWeight: '600', fontSize: 13 },

  // ─── User card ─────────────────────────────────────────────────────────────
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1.5, borderColor: '#e8e8e8' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  userLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: 14, fontWeight: '600', color: '#111', marginTop: 2 },
  profileChip: { borderWidth: 1.5, borderColor: '#111', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
  profileChipText: { color: '#111', fontWeight: '600', fontSize: 13 },

  // ─── Info card ─────────────────────────────────────────────────────────────
  infoCard: { backgroundColor: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: '#e8e8e8' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  infoStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#111', color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center', lineHeight: 22, marginRight: 10, marginTop: 1 },
  infoStepText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },
  infoBody: { fontSize: 14, color: '#555', lineHeight: 21 },

  // ─── Action buttons (outlined) ─────────────────────────────────────────────
  actionButton: { padding: 18, borderRadius: 12, marginBottom: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#111' },
  actionButtonPrimary: { padding: 18, borderRadius: 12, marginBottom: 10, backgroundColor: '#111' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  actionText: { color: '#111', fontWeight: '700', fontSize: 16 },
  actionTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionHint: { color: '#666', fontSize: 12, marginTop: 3 },
  actionHintPrimary: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: '#111', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

});
