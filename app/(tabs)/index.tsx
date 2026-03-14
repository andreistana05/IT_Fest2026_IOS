import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { sendEmergencySMS } from '../../services/smsService';

export default function Index() {
  const [loading, setLoading] = useState(false);

  const testSMS = async () => {
    setLoading(true);

    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Eroare', 'Permisiune locatie refuzata');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const location = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        address: 'Timisoara, Romania',
        mapsLink: `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`,
      };

      // Contacte de test — înlocuiești cu numărul tău real
      const contacts = [{ name: 'Test', phone: '+0754572103' }];

      await sendEmergencySMS(contacts, location, 'fall');
    } catch (error) {
      const err = error as Error;
      Alert.alert('Eroare', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test SMS + Locatie</Text>

      <TouchableOpacity style={styles.btn} onPress={testSMS}>
        <Text style={styles.btnText}>
          {loading ? 'Se trimite...' : 'Trimite SMS Test'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 32,
    color: '#111',
  },
  btn: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
