import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { saveUserLocation } from '../app/lib/firebase';

export type LocationState = {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
};

export function useLocationTracking(uid: string | null): LocationState {
  const [state, setState] = useState<LocationState>({ latitude: null, longitude: null, error: null });
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!uid) {
      setState({ latitude: null, longitude: null, error: null });
      return;
    }

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState(s => ({ ...s, error: 'Location permission denied' }));
        return;
      }

      // Get an immediate fix first
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = initial.coords;
      setState({ latitude, longitude, error: null });
      saveUserLocation(uid!, latitude, longitude).catch(() => {});

      // Then watch for updates
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30_000,   // every 30 seconds
          distanceInterval: 50,   // or when moved 50+ metres
        },
        (loc) => {
          const { latitude: lat, longitude: lng } = loc.coords;
          setState({ latitude: lat, longitude: lng, error: null });
          saveUserLocation(uid!, lat, lng).catch(() => {});
        },
      );
    }

    startTracking();

    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [uid]);

  return state;
}
