import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

export default function LandingScreen({ navigation }: any) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* ================= HERO ================= */}
      <LinearGradient
        colors={["#0f172a", "#1e293b"]}
        style={styles.hero}
      >
        <Text style={styles.logo}>🧠</Text>
        <Text style={styles.title}>NeuroMind AI</Text>
        <Text style={styles.subtitle}>
          Your AI-powered mental wellness companion
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.primaryText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ================= FEATURES ================= */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why NeuroMind?</Text>

        <View style={styles.card}>
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.cardTitle}>AI Chat Therapy</Text>
          <Text style={styles.cardDesc}>
            Talk anytime with an intelligent emotional assistant
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>😊</Text>
          <Text style={styles.cardTitle}>Mood Tracking</Text>
          <Text style={styles.cardDesc}>
            Track emotions and improve mental health patterns
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>🧠</Text>
          <Text style={styles.cardTitle}>Smart Memory</Text>
          <Text style={styles.cardDesc}>
            AI remembers your past conversations for better support
          </Text>
        </View>
      </View>

      {/* ================= DEVELOPER SECTION ================= */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍💻 Developer</Text>

        <View style={styles.devCard}>
          <Text style={styles.devName}>USAMA</Text>
          <Text style={styles.devRole}>
            Software Engineering Student
          </Text>
          <Text style={styles.devUni}>
            University of Agriculture Faisalabad (UAF)
          </Text>

          <Text style={styles.devDesc}>
            Passionate about building AI-powered applications focused on
            mental health, user experience, and real-world impact.
          </Text>
        </View>
      </View>

      {/* ================= FOOTER ================= */}
      <LinearGradient
        colors={["#020617", "#0f172a"]}
        style={styles.footer}
      >
        <Text style={styles.footerText}>
          © 2026 NeuroMind AI
        </Text>

        <Text style={styles.footerSub}>
          Built with ❤️ for mental wellness
        </Text>

        <Text style={styles.footerSmall}>
          Designed & Developed by USAMA
        </Text>
      </LinearGradient>
    </ScrollView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#020617",
  },

  /* HERO */
  hero: {
    padding: 30,
    alignItems: "center",
  },

  logo: {
    fontSize: 60,
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },

  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginVertical: 10,
  },

  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "bold",
  },

  linkText: {
    color: "#38bdf8",
    marginTop: 10,
  },

  /* SECTION */
  section: {
    padding: 20,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },

  /* FEATURE CARD */
  card: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },

  icon: {
    fontSize: 24,
    marginBottom: 6,
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "600",
  },

  cardDesc: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 13,
  },

  /* DEVELOPER */
  devCard: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 14,
  },

  devName: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "bold",
  },

  devRole: {
    color: "#e2e8f0",
    marginTop: 4,
  },

  devUni: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 10,
  },

  devDesc: {
    color: "#cbd5f5",
    fontSize: 13,
    lineHeight: 18,
  },

  /* FOOTER */
  footer: {
    padding: 20,
    alignItems: "center",
    marginTop: 20,
  },

  footerText: {
    color: "#e2e8f0",
    fontWeight: "bold",
  },

  footerSub: {
    color: "#94a3b8",
    marginTop: 4,
  },

  footerSmall: {
    color: "#64748b",
    marginTop: 6,
    fontSize: 12,
  },
});