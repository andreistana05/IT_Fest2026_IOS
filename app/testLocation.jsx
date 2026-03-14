import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

export default function TestLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Ceri permisiunea
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Permisiune locatie refuzata!');
        return;
      }

      // Obții coordonatele
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // Obții adresa din coordonate
      const geocode = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng
      });

      let address = 'Adresa indisponibila';
      if (geocode.length > 0) {
        const addr = geocode[0];
        address = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`.trim();
      }

      // Construiești linkul Google Maps
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

      setLocation({ lat, lng, address, mapsLink });

    } catch (err) {
      setError('Eroare: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    if (location) {
      Linking.openURL(location.mapsLink);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Test Locatie</Text>

      {/* Buton obtine locatie */}
      <TouchableOpacity style={styles.btn} onPress={getLocation}>
        <Text style={styles.btnText}>
          {loading ? 'Se obtine locatia...' : 'Obtine locatia mea'}
        </Text>
      </TouchableOpacity>

      {/* Loading */}
      {loading && (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      )}

      {/* Eroare */}
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {/* Rezultat */}
      {location && (
        <View style={styles.result}>

          <Text style={styles.label}>Latitudine:</Text>
          <Text style={styles.value}>{location.lat}</Text>

          <Text style={styles.label}>Longitudine:</Text>
          <Text style={styles.value}>{location.lng}</Text>

          <Text style={styles.label}>Adresa:</Text>
          <Text style={styles.value}>{location.address}</Text>

          <Text style={styles.label}>Link Google Maps:</Text>
          <Text style={styles.link}>{location.mapsLink}</Text>

          {/* Buton deschide Google Maps */}
          <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
            <Text style={styles.mapsBtnText}>Deschide in Google Maps</Text>
          </TouchableOpacity>

        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 24,
    color: '#111',
  },
  btn: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    color: '#DC2626',
    marginTop: 16,
    fontSize: 14,
  },
  result: {
    marginTop: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  value: {
    fontSize: 15,
    color: '#111',
    fontWeight: '500',
  },
  link: {
    fontSize: 13,
    color: '#2563EB',
  },
  mapsBtn: {
    backgroundColor: '#16A34A',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  mapsBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
});