import * as SMS from 'expo-sms';

export const sendEmergencySMS = async (contacts, location, alertType) => {
  try {
    // Verifici dacă SMS e disponibil pe telefon
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      console.log('SMS nu e disponibil pe acest dispozitiv');
      return { success: false, reason: 'SMS indisponibil' };
    }

    // Construiești mesajul
    const tip = alertType === 'fall' ? 'a cazut' : 'are nevoie de ajutor urgent';
    
    const message =
      `ALERTA URGENTA!\n\n` +
      `Persoana apropiata tie ${tip}!\n\n` +
      `Locatie: ${location.address}\n\n` +
      `Deschide harta:\n${location.mapsLink}\n\n` +
      `Apasa linkul pentru a vedea unde este.`;

    // Ia toate numerele de telefon din contacte
    const phoneNumbers = contacts.map(contact => contact.phone);

    // Deschide aplicatia de SMS cu mesajul pre-completat
    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);

    console.log('Rezultat SMS:', result);
    return { success: true, result };

  } catch (error) {
    console.error('Eroare SMS:', error);
    return { success: false, error };
  }
};