import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { LineChart } from "react-native-chart-kit";
import API from "../services/api";
import styles from "./styles/moodStyles";

const screenWidth = Dimensions.get("window").width;

// ==============================
// 🧠 MOOD MAP (FOR GRAPH)
// ==============================
const moodMap: Record<string, number> = {
  happy: 4,
  neutral: 3,
  sad: 2,
  anxious: 1,
};

// ==============================
// 🧠 LABEL MAP (FOR UI)
// ==============================
const moodLabel: Record<number, string> = {
  4: "😊",
  3: "😐",
  2: "😔",
  1: "😰",
};

export default function MoodScreen() {
  const [mood, setMood] = useState("happy");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ==============================
  // ✅ SAVE MOOD
  // ==============================
  const submitMood = async () => {
    try {
      setLoading(true);

      await API.post("/mood", { mood });

      Alert.alert("Saved", "Mood recorded ✅");

      await fetchHistory();
    } catch (err: any) {
      console.log("❌ Save mood error:", err?.response?.data);

      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to save mood"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // ✅ FETCH HISTORY
  // ==============================
  const fetchHistory = async () => {
    try {
      const res = await API.get("/mood");

      console.log("📊 Mood History:", res.data);

      setHistory(res.data?.data || []);
    } catch (err) {
      console.log("❌ Fetch mood error:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ==============================
  // 📊 SAFE CHART DATA
  // ==============================
  const chartData = {
    labels:
      history.length > 0
        ? history.map((_, i) => `${i + 1}`).slice(-7)
        : ["0"],
    datasets: [
      {
        data:
          history.length > 0
            ? history
                .slice(-7)
                .map((item) => moodMap[item.mood] || 2)
            : [2],
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>How are you feeling today?</Text>

      {/* ==============================
          😊 MOOD BUTTONS
      ============================== */}
      <View style={styles.row}>
        {["happy", "neutral", "sad", "anxious"].map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.moodBtn,
              mood === m && styles.activeMood,
            ]}
            onPress={() => setMood(m)}
          >
            <Text style={styles.moodText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ==============================
          🚀 SAVE BUTTON
      ============================== */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={submitMood}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Save Mood</Text>
        )}
      </TouchableOpacity>

      {/* ==============================
          📊 MOOD GRAPH
      ============================== */}
      {history.length > 0 && (
        <>
          <Text style={styles.title}>Mood History 📊</Text>

          <LineChart
            data={chartData}
            width={screenWidth - 30} // ✅ responsive
            height={220}
            yAxisInterval={1}
            fromZero
            chartConfig={{
              backgroundColor: "#0f172a",
              backgroundGradientFrom: "#0f172a",
              backgroundGradientTo: "#0f172a",
              decimalPlaces: 0,
              color: () => "#38bdf8",
              labelColor: () => "#94a3b8",
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#38bdf8",
              },
            }}
            bezier
            style={{
              borderRadius: 12,
              marginTop: 10,
            }}
          />

          {/* Emoji Legend */}
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: "#94a3b8", textAlign: "center" }}>
              😰 Anxious | 😔 Sad | 😐 Neutral | 😊 Happy
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}