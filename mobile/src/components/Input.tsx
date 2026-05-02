import React from "react";
import { TextInput, View, Text, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

type Props = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
};

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Label */}
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtext}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          error ? styles.inputError : null,
        ]}
      />

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 12,
  },

  label: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 6,
  },

  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    color: colors.text,
  },

  inputError: {
    borderColor: "#ef4444",
  },

  error: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 5,
  },
});