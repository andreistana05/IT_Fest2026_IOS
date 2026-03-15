import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, saveUserProfile } from './lib/firebase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegister() {
    setLoading(true);
    try {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        Alert.alert('Invalid email', 'Please enter a valid email address');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        Alert.alert('Invalid password', 'Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCred.user;

      await saveUserProfile({
        uid: user.uid,
        email: user.email || email.trim(),
        name: name || user.displayName || null,
        phone: phoneNumber || null,
        fcmToken: null,
      });

      router.replace('/');
    } catch (err: any) {
      Alert.alert('Registration failed', err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string) => [styles.input, focused === field && styles.inputFocused];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>FallDetector</Text>
          <Text style={styles.subtitle}>Create your alert account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Required information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address <Text style={styles.required}>*</Text></Text>
            <TextInput
              placeholder="e.g. yourname@email.com"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={inputStyle('email')}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
            <Text style={styles.hint}>Used to sign in and receive alerts</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <TextInput
              placeholder="Choose a strong password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={inputStyle('password')}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
            <Text style={styles.hint}>Must be at least 6 characters long</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Optional information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              placeholder="e.g. John Doe"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={setName}
              style={inputStyle('name')}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
            <Text style={styles.hint}>Displayed on your profile</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your phone number</Text>
            <TextInput
              placeholder="e.g. +40712345678"
              placeholderTextColor="#aaa"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={inputStyle('phone')}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
            />
            <Text style={styles.hint}>Strongly recommended — this is how others link you as their emergency contact so you get alerted when they fall. Include country code (e.g. +40).</Text>
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create account'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.link}> Sign in here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  header: { alignItems: 'center', marginBottom: 28 },
  appName: { fontSize: 32, fontWeight: '800', color: '#111', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: '#999', marginTop: 6 },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1.5, borderColor: '#e8e8e8' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  required: { color: '#111' },
  input: { backgroundColor: '#fafafa', padding: 14, borderRadius: 10, fontSize: 16, color: '#111', borderWidth: 1.5, borderColor: '#e8e8e8', lineHeight: 20 },
  inputFocused: { borderColor: '#111', backgroundColor: '#fff' },
  hint: { fontSize: 12, color: '#bbb', marginTop: 5 },
  button: { backgroundColor: '#111', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { color: '#999', fontSize: 14 },
  link: { color: '#111', fontWeight: '700', fontSize: 14 },
});
