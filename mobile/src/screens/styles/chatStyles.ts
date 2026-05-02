import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  /* =========================
     HEADER (GLASS READY)
  ========================= */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 16,
    paddingVertical: 14,

    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },

  headerTitle: {
    color: "#38bdf8",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.5,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerBtn: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },

  headerBtnDanger: {
    color: "#ef4444",
  },

  /* =========================
     CHAT AREA
  ========================= */
  chatContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 100, // space for input
  },

  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 60,
    fontSize: 14,
  },

  /* =========================
     MESSAGE SPACING
  ========================= */
  messageRow: {
    marginVertical: 4,
  },

  /* =========================
     TYPING INDICATOR (DOTS)
  ========================= */
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  typingBubble: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#94a3b8",
    marginHorizontal: 2,
  },

  typingText: {
    color: "#94a3b8",
    marginLeft: 8,
    fontSize: 12,
  },

  /* =========================
     INPUT AREA (GLASS STYLE)
  ========================= */
  inputWrapper: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",

    margin: 10,
    padding: 8,

    borderRadius: 18,

    backgroundColor: "rgba(2,6,23,0.85)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },

  input: {
    flex: 1,

    backgroundColor: "#1e293b",
    borderRadius: 14,

    paddingHorizontal: 14,
    paddingVertical: 10,

    color: "#fff",
    fontSize: 14,

    maxHeight: 120,
  },

  sendBtn: {
    marginLeft: 10,

    backgroundColor: "#38bdf8",

    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,

    justifyContent: "center",
    alignItems: "center",
  },

  sendBtnDisabled: {
    opacity: 0.5,
  },

  sendText: {
    color: "#020617",
    fontWeight: "700",
    fontSize: 14,
  },

  /* =========================
     SHADOW (DEPTH)
  ========================= */
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});