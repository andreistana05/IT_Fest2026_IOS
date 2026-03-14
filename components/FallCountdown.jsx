/*

import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const COUNTDOWN_SECONDS = 30;

export default function FallCountdown({ onConfirm, onCancel }) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Vibrează telefonul ca să alerteze utilizatorul
    Vibration.vibrate([500, 500, 500, 500, 500]);

    // Pornește countdown-ul
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onConfirm(); // trimite alerta dacă ajunge la 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Curăță când componenta dispare
    return () => {
      clearInterval(intervalRef.current);
      Vibration.cancel();
    };
  }, []);

  const handleCancel = () => {
    clearInterval(intervalRef.current);
    Vibration.cancel();
    onCancel(); // utilizatorul e bine
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ai cazut?</Text>

      <Text style={styles.countdown}>{seconds}</Text>

      <Text style={styles.subtitle}>
        Alerta se trimite automat in {seconds} secunde
      </Text>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>Sunt bine!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(220, 38, 38, 0.97)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  title: {
    fontSize: 32,
    fontWeight: "500",
    color: "white",
    marginBottom: 20,
  },
  countdown: {
    fontSize: 120,
    fontWeight: "500",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 60,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  cancelBtn: {
    backgroundColor: "white",
    paddingVertical: 18,
    paddingHorizontal: 56,
    borderRadius: 999,
  },
  cancelText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#DC2626",
  },
});

*/