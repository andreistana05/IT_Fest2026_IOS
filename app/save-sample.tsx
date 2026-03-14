import React, { useState } from 'react';
import { Alert, Button, View } from 'react-native';
import { saveUserProfile } from './lib/firebase';

export default function SaveSample() {
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const sample = {
        uid: '6eiTrfDexBPIJDkIg9i1VGXEyvr2',
        email: 'andrew.miroiu@gmail.com',
        name: 'Andrei Miroiu',
        phone: '0755701585',
        fcmToken: 'dfnC27WYQEiYaw6d8FicwJ:APA91bEXzHU4Nib9bpS9uXRIbmvA-keEbGaMrCLtC7y0mUTFUpzB6uoDpw4LbpxIcTYDzNIZ-7EejYSJ1z5iipU3zzMUbjuHEKeLvYYVoCJ4QD_XFRrlT2E',
        createdAt: 1773496882574,
      };

      await saveUserProfile(sample as any);
      Alert.alert('Saved', 'Sample user saved to Firestore');
    } catch (err: any) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button title={loading ? 'Saving...' : 'Save sample user to Firestore'} onPress={handleSave} disabled={loading} />
    </View>
  );
}
