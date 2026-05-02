import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const globalStyles = StyleSheet.create({
  // =========================
  // LAYOUT
  // =========================
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },

  center: {
    justifyContent: "center",
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  // =========================
  // TEXT
  // =========================
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },

  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 4,
  },

  text: {
    color: colors.text,
    fontSize: 14,
  },

  mutedText: {
    color: colors.muted,
    fontSize: 12,
  },

  // =========================
  // INPUT
  // =========================
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    color: colors.text,
    marginVertical: 8,
  },

  // =========================
  // BUTTONS
  // =========================
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 8,
  },

  // =========================
  // CARDS
  // =========================
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});