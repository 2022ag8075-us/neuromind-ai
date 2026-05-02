import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

const styles = StyleSheet.create({
  // =========================
  // CONTAINER
  // =========================
  container: {
    width: "100%",
    marginVertical: 6,
    flexDirection: "row",
    paddingHorizontal: 10,
  },

  // LEFT (AI)
  aiContainer: {
    justifyContent: "flex-start",
  },

  // RIGHT (USER)
  userContainer: {
    justifyContent: "flex-end",
  },

  // =========================
  // BUBBLE
  // =========================
  bubble: {
    maxWidth: "75%", // 🔥 ChatGPT feel
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },

  aiBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },

  // =========================
  // TEXT
  // =========================
  text: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  // =========================
  // TIME (optional)
  // =========================
  time: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 4,
    alignSelf: "flex-end",
  },
});

export default styles;