import { db } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getCurrentLocation } from './locationService';
import { sendEmergencySMS } from './smsService';

export const sendAlert = async (userId, userName, alertType, contacts) => {
  try {
    // Pasul 1: obții locația
    const location = await getCurrentLocation();

    // Pasul 2: salvezi în Firebase
    const alertRef = await addDoc(collection(db, 'alerts'), {
      userId: userId,
      userName: userName,
      type: alertType,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        address: location.address,
        mapsLink: location.mapsLink
      },
      contacts: contacts,
      status: 'sent',
      timestamp: serverTimestamp()
    });

    console.log('Alerta salvata in Firebase:', alertRef.id);

    // Pasul 3: trimiti SMS
    await sendEmergencySMS(contacts, location, alertType);

    return {
      success: true,
      alertId: alertRef.id,
      location: location
    };

  } catch (error) {
    console.error('Eroare la trimiterea alertei:', error);
    throw error;
  }
};