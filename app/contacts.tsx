import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from './lib/auth';
import { db } from './lib/firebase';

export default function ContactsScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'users', user.uid, 'contacts');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const items: any[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      setContacts(items);
    }, e => {
      console.warn('contacts snapshot error', e);
    });
    return unsub;
  }, [user]);

  async function handleAdd() {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add contacts.');
      return;
    }
    const p = phone.trim();
    if (!p) { Alert.alert('Phone required', 'Please enter a phone number'); return; }
    setLoading(true);
    try {
      const col = collection(db, 'users', user.uid, 'contacts');
      await addDoc(col, { name: name.trim() || null, phone: p, createdAt: Date.now() });
      const norm = p.replace(/[^0-9+]/g, '');
      const idxRef = doc(db, 'phone_index', norm);
      try {
        await updateDoc(idxRef, { followers: arrayUnion(user.uid) });
      } catch (e) {
        await setDoc(idxRef, { followers: [user.uid] }, { merge: true });
      }
      setName(''); setPhone('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to check contacts.');
      return;
    }
    const p = phone.trim();
    if (!p) { Alert.alert('Phone required', 'Please enter a phone number to check'); return; }
    setLoading(true);
    try {
      const norm = p.replace(/[^0-9+]/g, '');
      const idxRef = doc(db, 'phone_index', norm);
      const idxSnap = await getDoc(idxRef);
      const followers = idxSnap.exists() ? (idxSnap.data() as any).followers || [] : [];

      const found: any[] = [];
      const q1 = query(collection(db, 'users'), where('phone', '==', p));
      const snap1 = await getDocs(q1);
      snap1.forEach(d => found.push({ id: d.id, ...d.data() }));
      if (found.length === 0 && norm !== p) {
        const q2 = query(collection(db, 'users'), where('phone', '==', norm));
        const snap2 = await getDocs(q2);
        snap2.forEach(d => found.push({ id: d.id, ...d.data() }));
      }

      Alert.alert('Check result', `phone_index followers: ${followers.length}\nmatched users: ${found.length}${found.length ? '\n' + found.map(u => `${u.id} (${u.email || '-'})`).join('\n') : ''}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to check phone');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      const cRef = doc(db, 'users', user.uid, 'contacts', id);
      const cSnap = await getDoc(cRef);
      const phoneVal = cSnap.exists() ? (cSnap.data() as any).phone : null;
      await deleteDoc(cRef);
      if (phoneVal) {
        const norm = String(phoneVal).replace(/[^0-9+]/g, '');
        const idxRef = doc(db, 'phone_index', norm);
        try {
          await updateDoc(idxRef, { followers: arrayRemove(user.uid) });
        } catch (e) {
          // ignore
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete contact');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Monitored Contacts</Text>
        <Text style={styles.pageHint}>
          Add the phone number of each person you want to watch over. You will be alerted by SMS the moment their device detects a fall.
        </Text>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Add a person to monitor</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Their name</Text>
            <TextInput
              placeholder="e.g. Mom, Grandpa, John"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={setName}
              style={[styles.input, focused === 'name' && styles.inputFocused]}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
            <Text style={styles.hint}>Optional — helps you identify who triggered an alert</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Their phone number <Text style={styles.required}>*</Text></Text>
            <TextInput
              placeholder="e.g. +40712345678"
              placeholderTextColor="#aaa"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.input, focused === 'phone' && styles.inputFocused]}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
            />
            <Text style={styles.hint}>Must match the number registered on their device — include country code</Text>
          </View>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.addButton, { flex: 1, marginRight: 8 }, loading && styles.buttonDisabled]}
              onPress={handleAdd}
              disabled={loading}
            >
              <Text style={styles.addText}>{loading ? 'Adding...' : '+ Add contact'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkButton, { width: 110 }, loading && styles.buttonDisabled]}
              onPress={handleCheck}
              disabled={loading}
            >
              <Text style={styles.checkText}>Check</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Your contacts</Text>
          <Text style={styles.listCount}>{contacts.length} total</Text>
        </View>

        <FlatList
          data={contacts}
          keyExtractor={(i) => i.id}
          style={{ width: '100%' }}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemIcon}>
                <Text style={styles.itemIconText}>{(item.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.itemName}>{item.name ?? 'No name'}</Text>
                <Text style={styles.itemPhone}>{item.phone}</Text>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No one being monitored yet</Text>
              <Text style={styles.emptyHint}>Add a person's phone number above. As soon as their device detects a fall, you'll receive an alert.</Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f8' },
  title: { fontSize: 22, fontWeight: '800', color: '#2c3e50', marginBottom: 4 },
  pageHint: { fontSize: 13, color: '#7f8c8d', marginBottom: 16 },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  formTitle: { fontSize: 13, fontWeight: '700', color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#34495e', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
  required: { color: '#e74c3c' },
  input: { backgroundColor: '#f7f9fb', padding: 13, borderRadius: 10, fontSize: 15, color: '#111', borderWidth: 1.5, borderColor: '#dce1e7', lineHeight: 20 },
  inputFocused: { borderColor: '#27ae60', backgroundColor: '#fff' },
  hint: { fontSize: 12, color: '#95a5a6', marginTop: 4 },
  rowButtons: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  addButton: { backgroundColor: '#27ae60', padding: 13, borderRadius: 10, alignItems: 'center' },
  addText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  checkButton: { backgroundColor: '#f39c12', padding: 13, borderRadius: 10, alignItems: 'center' },
  checkText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  listCount: { fontSize: 13, color: '#95a5a6' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dfe6e9', alignItems: 'center', justifyContent: 'center' },
  itemIconText: { fontSize: 18, fontWeight: '700', color: '#2d3436' },
  itemName: { fontWeight: '600', fontSize: 15, color: '#2c3e50' },
  itemPhone: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  deleteButton: { backgroundColor: '#e74c3c', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#95a5a6', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#bdc3c7', textAlign: 'center' },
});
