import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#0f172a",
    alignItems: "center",
  },

  // HERO
  hero: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },

  logo: {
    fontSize: 50,
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#38bdf8",
  },

  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
  },

  // BUTTONS
  primaryButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 20,
  },

  primaryText: {
    color: "#0f172a",
    fontWeight: "bold",
  },

  linkText: {
    color: "#94a3b8",
    marginTop: 10,
  },

  // FEATURES
  featuresContainer: {
    marginTop: 40,
    width: "100%",
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },

  featureCard: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  featureIcon: {
    fontSize: 24,
    marginBottom: 6,
  },

  featureTitle: {
    color: "#fff",
    fontWeight: "600",
  },

  featureDesc: {
    color: "#94a3b8",
    marginTop: 4,
  },

  // SOCIAL
  socialContainer: {
    marginTop: 30,
    alignItems: "center",
  },

  socialRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  socialIcon: {
    fontSize: 24,
    marginHorizontal: 10,
  },

  // FOOTER
  footer: {
    marginTop: 40,
    marginBottom: 20,
  },

  footerText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
  },
});