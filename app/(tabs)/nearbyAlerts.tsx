import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

// Functie care calculeaza distanta in metri intre 2 coordonate
const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000; // raza pamantului in metri
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NearbyAlerts() {
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyPeople, setNearbyPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Pasul 1: obtii locatia ta
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Eroare', 'Permisiune locatie refuzata');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const myLat = loc.coords.latitude;
      const myLng = loc.coords.longitude;
      setMyLocation({ lat: myLat, lng: myLng });

      // Pasul 2: citesti toate evenimentele din Firebase
      const snapshot = await getDocs(collection(db, 'fall_events'));
      
      const nearby: any[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Pasul 3: calculezi distanta fata de fiecare persoana
        const distance = getDistanceInMeters(
          myLat, myLng,
          data.latitude, data.longitude
        );

        // Pasul 4: pastrezi doar cei in raza de 500m
        if (distance <= 500) {
          nearby.push({
            id: doc.id,
            name: data.name,
            phone: data.phone,
            latitude: data.latitude,
            longitude: data.longitude,
            status: data.status,
            distance: Math.round(distance) // distanta in metri
          });
        }
      });

      setNearbyPeople(nearby);

    } catch (error) {
      console.error('Eroare:', error);
    } finally {
      setLoading(false);
    }
  };

  const callPerson = (phone: string) => {
    const { Linking } = require('react-native');
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Se incarca...</Text>
      </View>
    );
  }

  if (!myLocation) return null;

  return (
    <View style={styles.container}>

      {/* Harta */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: myLocation.lat,
          longitude: myLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Locatia ta — marker albastru */}
        <Marker
          coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
          title="Tu esti aici"
          pinColor="blue"
        />

        {/* Cercul de 500m */}
        <Circle
          center={{ latitude: myLocation.lat, longitude: myLocation.lng }}
          radius={500}
          fillColor="rgba(37, 99, 235, 0.1)"
          strokeColor="rgba(37, 99, 235, 0.4)"
          strokeWidth={2}
        />

        {/* Persoanele cazute in raza */}
        {nearbyPeople.map(person => (
          <Marker
            key={person.id}
            coordinate={{ latitude: person.latitude, longitude: person.longitude }}
            title={person.name}
            description={`La ${person.distance}m distanta`}
            pinColor="red"
          />
        ))}
      </MapView>

      {/* Lista persoane */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          {nearbyPeople.length === 0
            ? 'Nicio persoana in raza de 500m'
            : `${nearbyPeople.length} persoana/e in raza de 500m`}
        </Text>

        {nearbyPeople.map(person => (
          <View key={person.id} style={styles.personCard}>
            <View>
              <Text style={styles.personName}>{person.name}</Text>
              <Text style={styles.personDistance}>La {person.distance}m distanta</Text>
              <Text style={styles.personStatus}>Status: {person.status}</Text>
            </View>

            {/* Buton suna */}
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => callPerson(person.phone)}
            >
              <Text style={styles.callBtnText}>Suna</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Buton refresh */}
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Text style={styles.refreshBtnText}>Actualizeaza</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  map: {
    flex: 1,
  },
  listContainer: {
    backgroundColor: '#fff',
    padding: 16,
    maxHeight: 280,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
    marginBottom: 12,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#FECACA',
  },
  personName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  personDistance: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  personStatus: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  callBtnText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  refreshBtn: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshBtnText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
});