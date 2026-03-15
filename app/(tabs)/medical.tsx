import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { db, saveMedicalRecord } from '../lib/firebase';

export default function MedicalScreen() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medication, setMedication] = useState('');

  const [editConditions, setEditConditions] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editMedication, setEditMedication] = useState('');

  useEffect(() => {
    if (!user) { setMedicalConditions(''); setAllergies(''); setMedication(''); return; }

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (snap.exists()) {
          const data = snap.data();
          setMedicalConditions(data.medicalConditions ?? '');
          setAllergies(data.allergies ?? '');
          setMedication(data.medication ?? '');
        }
      } catch (e) {
        console.warn('Failed to load medical record', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  function startEditing() {
    setEditConditions(medicalConditions);
    setEditAllergies(allergies);
    setEditMedication(medication);
    setEditing(true);
  }

  async function saveEdits() {
    if (!user) return;
    setSaving(true);
    try {
      await saveMedicalRecord(user.uid, {
        medicalConditions: editConditions.trim() || null,
        allergies: editAllergies.trim() || null,
        medication: editMedication.trim() || null,
      });
      setMedicalConditions(editConditions.trim());
      setAllergies(editAllergies.trim());
      setMedication(editMedication.trim());
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
        <Text style={styles.notSignedInText}>Please sign in to manage your medical record.</Text>
      </View>
    );
  }

  const hasAnyData = medicalConditions || allergies || medication;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Medical Record</Text>
      <Text style={styles.pageSubtitle}>
        This information will be included in your emergency SOS messages to help first responders.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <>
          {!hasAnyData && !editing && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No medical info added</Text>
              <Text style={styles.emptyText}>
                Tap Edit to add your medical conditions, allergies, and current medication. This info will be sent alongside your location in an SOS alert.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Medical information</Text>
              {!editing && (
                <TouchableOpacity onPress={startEditing}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Medical conditions</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editConditions}
                  onChangeText={setEditConditions}
                  placeholder="e.g. diabetes, hypertension"
                  placeholderTextColor="#bbb"
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{medicalConditions || '—'}</Text>
              )}
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Allergies</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editAllergies}
                  onChangeText={setEditAllergies}
                  placeholder="e.g. penicillin, peanuts"
                  placeholderTextColor="#bbb"
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{allergies || '—'}</Text>
              )}
            </View>

            <View style={styles.separator} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Current medication</Text>
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editMedication}
                  onChangeText={setEditMedication}
                  placeholder="e.g. metformin 500mg, aspirin"
                  placeholderTextColor="#bbb"
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{medication || '—'}</Text>
              )}
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

          {hasAnyData && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Included in SOS alerts</Text>
              <Text style={styles.infoBody}>
                When you send an SOS, your emergency contacts will receive this medical information along with your location so first responders can act faster.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#999', marginBottom: 24, lineHeight: 20 },
  notSignedIn: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  notSignedInTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  notSignedInText: { fontSize: 15, color: '#999', textAlign: 'center' },

  emptyCard: { backgroundColor: '#fafafa', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#e8e8e8' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#666', lineHeight: 20 },

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

  infoCard: { backgroundColor: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: '#e8e8e8' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoBody: { fontSize: 14, color: '#555', lineHeight: 21 },
});
