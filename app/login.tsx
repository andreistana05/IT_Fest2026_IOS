import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from './lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();

  async function handleLogin() {
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

      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login failed', err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>FallGuard</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              placeholder="e.g. yourname@email.com"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, emailFocused && styles.inputFocused]}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.input, passwordFocused && styles.inputFocused]}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Text style={styles.hint}>Minimum 6 characters required</Text>
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.link}> Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f0f4f8' },
  header: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 32, fontWeight: '800', color: '#2c3e50', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginTop: 6 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#34495e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { backgroundColor: '#f7f9fb', padding: 14, borderRadius: 10, fontSize: 16, color: '#111', borderWidth: 1.5, borderColor: '#dce1e7', lineHeight: 20 },
  inputFocused: { borderColor: '#3498db', backgroundColor: '#fff' },
  hint: { fontSize: 12, color: '#95a5a6', marginTop: 5 },
  button: { backgroundColor: '#3498db', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { color: '#7f8c8d', fontSize: 14 },
  link: { color: '#3498db', fontWeight: '600', fontSize: 14 },
});
