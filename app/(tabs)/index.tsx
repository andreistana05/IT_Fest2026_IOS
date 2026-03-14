import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { saveAlert } from '../alerts';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [lastAlert, setLastAlert] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const router = useRouter();
  const { user, signOutUser, loading: authLoading } = useAuth();

  // Live alert count badge
  useEffect(() => {
    if (!user) { setAlertCount(0); return; }
    const col = collection(db, 'users', user.uid, 'alerts');
    const q = query(col, orderBy('receivedAt', 'desc'));
    const unsub = onSnapshot(q, snap => setAlertCount(snap.size));
    return unsub;
  }, [user]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as any;
      const body = notification.request.content.body;
      setLastAlert(new Date().toLocaleTimeString());

      if (user) {
        saveAlert(user.uid, {
          contactName: data?.contactName ?? null,
          contactPhone: data?.contactPhone ?? null,
          message: body ?? data?.message ?? null,
          receivedAt: Date.now(),
        }).catch(e => console.warn('Failed to save alert', e));
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // handle tap on notification
    });

    return () => {
      if (notificationListener.current && typeof notificationListener.current.remove === 'function') {
        notificationListener.current.remove();
      }
      if (responseListener.current && typeof responseListener.current.remove === 'function') {
        responseListener.current.remove();
      }
    };
  }, []);

  const initials = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appName}>FallGuard</Text>
          <Text style={styles.appTagline}>Fall alert companion</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuText}>☰</Text>
        </TouchableOpacity>
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
              <Text style={styles.infoTitle}>How FallGuard works</Text>
              <View style={styles.infoStep}>
                <Text style={styles.infoStepNum}>1</Text>
                <Text style={styles.infoStepText}>Your loved one uses the Android app, which continuously monitors for falls.</Text>
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
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#16a085' }]} onPress={() => router.push('/contacts')}>
              <Text style={styles.actionText}>Monitored contacts</Text>
              <Text style={styles.actionHint}>Add people whose falls you want to be alerted about</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#e67e22' }]} onPress={() => router.push('/alerts')}>
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

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#e74c3c' }]} onPress={() => signOutUser()}>
              <Text style={styles.actionText}>Sign out</Text>
              <Text style={styles.actionHint}>End your session</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Not signed in — explain the app */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What is FallGuard?</Text>
              <Text style={styles.infoBody}>
                FallGuard alerts you the moment a family member or close friend falls. The Android app on their device detects the fall and immediately sends an SMS to their emergency contacts — including you.
              </Text>
              <Text style={[styles.infoBody, { marginTop: 8 }]}>
                Sign in or create an account to start monitoring the people you care about.
              </Text>
            </View>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3498db' }]} onPress={() => router.push('/login')}>
              <Text style={styles.actionText}>Sign in</Text>
              <Text style={styles.actionHint}>Access your account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#9b59b6' }]} onPress={() => router.push('/register')}>
              <Text style={styles.actionText}>Create an account</Text>
              <Text style={styles.actionHint}>Register to start receiving fall alerts</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Sidebar */}
      <Modal transparent visible={sidebarVisible} animationType="slide">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>FallGuard</Text>
          <Text style={styles.sidebarSubtitle}>Fall alert companion</Text>
          {!user ? (
            <>
              <TouchableOpacity style={[styles.sidebarItem, { backgroundColor: '#3498db' }]} onPress={() => { setSidebarVisible(false); router.push('/login'); }}>
                <Text style={styles.sidebarItemText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sidebarItem, { backgroundColor: '#9b59b6' }]} onPress={() => { setSidebarVisible(false); router.push('/register'); }}>
                <Text style={styles.sidebarItemText}>Register</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.sidebarItem, { backgroundColor: '#16a085' }]} onPress={() => { setSidebarVisible(false); router.push('/contacts'); }}>
                <Text style={styles.sidebarItemText}>Monitored Contacts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sidebarItem, { backgroundColor: '#e67e22' }]} onPress={() => { setSidebarVisible(false); router.push('/alerts'); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.sidebarItemText}>Alert History</Text>
                  {alertCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{alertCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sidebarItem, { backgroundColor: '#3498db' }]} onPress={() => { setSidebarVisible(false); router.push('/profile'); }}>
                <Text style={styles.sidebarItemText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sidebarItem, { backgroundColor: '#e74c3c' }]} onPress={() => { setSidebarVisible(false); signOutUser(); }}>
                <Text style={styles.sidebarItemText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20, paddingTop: 60 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  appName: { fontSize: 26, fontWeight: '800', color: '#2c3e50', letterSpacing: 0.5 },
  appTagline: { fontSize: 12, color: '#95a5a6', marginTop: 2 },
  menuButton: { padding: 4, marginTop: 4 },
  menuText: { fontSize: 26, color: '#2c3e50' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdecea', borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
  alertBannerIcon: { fontSize: 22 },
  alertBannerTitle: { fontWeight: '700', color: '#c0392b', fontSize: 15 },
  alertBannerTime: { fontSize: 13, color: '#e74c3c', marginTop: 2 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusDotOk: { backgroundColor: '#27ae60' },
  statusDotAlert: { backgroundColor: '#e74c3c' },
  statusLabel: { fontSize: 12, color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusText: { fontSize: 15, fontWeight: '600', color: '#2c3e50', marginTop: 2 },

  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dfe6e9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2d3436' },
  userLabel: { fontSize: 11, color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginTop: 2 },
  profileChip: { backgroundColor: '#eaf4fd', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  profileChipText: { color: '#3498db', fontWeight: '600', fontSize: 13 },

  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginBottom: 12 },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  infoStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#16a085', color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center', lineHeight: 22, marginRight: 10, marginTop: 1 },
  infoStepText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },
  infoBody: { fontSize: 14, color: '#555', lineHeight: 21 },

  actionButton: { padding: 18, borderRadius: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: '#fff', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  badgeText: { color: '#e67e22', fontSize: 11, fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, padding: 24, paddingTop: 60, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  sidebarTitle: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  sidebarSubtitle: { fontSize: 12, color: '#95a5a6', marginBottom: 24, marginTop: 2 },
  sidebarItem: { padding: 14, borderRadius: 10, marginBottom: 10 },
  sidebarItemText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
