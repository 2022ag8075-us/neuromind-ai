import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

const styles = StyleSheet.create({
  // =========================
  // CONTAINER
  // =========================
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  // =========================
  // TITLES
  // =========================
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },

  subtitle: {
    color: colors.subtext,
    textAlign: "center",
    marginBottom: 10,
  },

  // =========================
  // MOOD BUTTON GRID
  // =========================
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },

  moodBtn: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activeMood: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },

  moodText: {
    color: colors.text,
    fontSize: 13,
    textTransform: "capitalize",
  },

  // =========================
  // SUBMIT BUTTON
  // =========================
  submitBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  submitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  // =========================
  // CHART SECTION
  // =========================
  chartContainer: {
    marginTop: 30,
    alignItems: "center",
  },

  emptyText: {
    color: colors.subtext,
    textAlign: "center",
    marginTop: 30,
  },
});

export default styles;