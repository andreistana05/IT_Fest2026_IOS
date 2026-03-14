import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Push registration removed (not used in device-SMS workflow)

export default function App() {
  const [status, setStatus] = useState('Sistem activ - Monitorizare...');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const router = useRouter();
  const { user, signOutUser, loading: authLoading } = useAuth();

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setStatus('Alerta primita — verificati contactele');
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // handle interaction
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


  // Push registration and test notification functions removed

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FallGuard Connect (iOS)</Text>

      <View style={styles.card}>
        <Text style={styles.statusLabel}>Stare sistem:</Text>
        <Text style={styles.statusText}>{status}</Text>
        {/* Expo push token display removed */}
        <Text style={{ marginTop: 10, color: '#34495e' }}>User:</Text>
        <Text style={{ fontSize: 12, color: '#7f8c8d' }}>{authLoading ? 'Loading...' : user?.email ?? 'Not signed in'}</Text>
      </View>


      {/* Push token registration and test notification buttons removed */}

      <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
        <Text style={styles.menuText}>☰</Text>
      </TouchableOpacity>

      <Modal transparent visible={sidebarVisible} animationType="slide">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Menu</Text>
          {!user ? (
            <>
              <TouchableOpacity style={[styles.button, { width: '100%' }]} onPress={() => { setSidebarVisible(false); router.push('/login'); }}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { width: '100%', backgroundColor: '#9b59b6' }]} onPress={() => { setSidebarVisible(false); router.push('/register'); }}>
                <Text style={styles.buttonText}>Register</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.button, { width: '100%', backgroundColor: '#e74c3c' }]} onPress={() => { setSidebarVisible(false); signOutUser(); }}>
              <Text style={styles.buttonText}>Sign out</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {user ? (
        <TouchableOpacity style={[styles.button, styles.navButton, { backgroundColor: '#e74c3c' }]} onPress={() => signOutUser()}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#2c3e50' },
  card: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statusLabel: { fontSize: 14, color: '#7f8c8d' },
  statusText: { fontSize: 18, fontWeight: '600', color: '#27ae60' },
  button: { marginTop: 20, backgroundColor: '#3498db', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
  ,navButton: { marginTop: 10 }
  ,menuButton: { position: 'absolute', top: 40, right: 20, zIndex: 20 },
  menuText: { fontSize: 28, color: '#2c3e50' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, padding: 20, backgroundColor: '#fff' },
  sidebarTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 }
});