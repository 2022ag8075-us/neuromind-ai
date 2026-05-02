import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
} from "react-native";

import API, { setToken } from "../services/api";
import { authStyles as styles } from "./styles/authStyles";
import { useAuth } from "../context/AuthContext"; // ✅ IMPORTANT
import Input from "../components/Input";
import Button from "../components/Button";

export default function LoginScreen({ navigation }: any) {
  const { refreshAuth } = useAuth(); // ✅ triggers navigator update

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // 🔐 LOGIN HANDLER
  // =========================
  const handleLogin = async () => {
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // =========================
    // VALIDATION
    // =========================
    if (!cleanEmail || !cleanPassword) {
      return Alert.alert("Error", "Please fill all fields");
    }

    if (!cleanEmail.includes("@")) {
      return Alert.alert("Error", "Enter a valid email");
    }

    if (cleanPassword.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      console.log("🔐 LOGIN REQUEST STARTED");

      // =========================
      // API CALL
      // =========================
      const res = await API.post("/auth/login", {
        email: cleanEmail,
        password: cleanPassword,
      });

      console.log("✅ LOGIN SUCCESS:", res.data);

      // =========================
      // TOKEN SAVE
      // =========================
      if (!res.data?.token) {
        throw new Error("Token missing from server");
      }

      await setToken(res.data.token);

      console.log("🔐 TOKEN SAVED");

      // =========================
      // 🔥 THIS FIXES NAVIGATION
      // =========================
      await refreshAuth();

      console.log("🚀 USER AUTH STATE UPDATED");

    } catch (err: any) {
      console.log("❌ LOGIN ERROR:", err.response?.data || err.message);

      const message =
        err.response?.data?.message ||
        err.message ||
        "Invalid credentials / network error";

      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back 👋</Text>

        {/* EMAIL */}
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
        />

        {/* PASSWORD */}
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[
            styles.button,
            loading && { opacity: 0.7 }, // disable effect
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* NAVIGATION */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.linkText}>
            Don't have an account? Register
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}