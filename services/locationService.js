import * as Location from 'expo-location';
import { db } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Obține locația curentă
export const getCurrentLocation = async () => {
  // Pasul 1: ceri permisiunea de locație
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permisiune locație refuzată');
  }

  // Pasul 2: obții coordonatele exacte
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });

  const { latitude, longitude } = location.coords;

  // Pasul 3: transformi coordonatele în adresă text
  const address = await getAddressFromCoords(latitude, longitude);

  return {
    lat: latitude,
    lng: longitude,
    address: address,
    mapsLink: `https://maps.google.com/?q=${latitude},${longitude}`
  };
};

// Transformă coordonate în adresă text
const getAddressFromCoords = async (lat, lng) => {
  try {
    const result = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng
    });

    if (result.length > 0) {
      const addr = result[0];
      return `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`.trim();
    }
    return 'Adresa indisponibila';
  } catch {
    return 'Adresa indisponibila';
  }
};

// Salvează locația în Firebase
export const saveLocationToFirebase = async (userId, lat, lng, address) => {
  try {
    const docRef = await addDoc(collection(db, 'locations'), {
      userId: userId,
      latitude: lat,
      longitude: lng,
      address: address,
      mapsLink: `https://maps.google.com/?q=${lat},${lng}`,
      timestamp: serverTimestamp()
    });

    console.log('Locatie salvata in Firebase cu ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Eroare la salvarea locatiei:', error);
    throw error;
  }
};