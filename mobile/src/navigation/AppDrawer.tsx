import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";

import ChatScreen from "../screens/ChatScreen";
import { clearToken } from "../services/api";
import { useChat } from "../context/ChatContext"; // ✅ REQUIRED

const Drawer = createDrawerNavigator();

// ==============================
// 🎯 CUSTOM DRAWER
// ==============================
function CustomDrawerContent(props: any) {
  const { navigation } = props;
  const { sessions, fetchSessions } = useChat();

  // =========================
  // 🔐 LOGOUT
  // =========================
  const handleLogout = async () => {
    await clearToken();
    navigation.replace("Login");
  };

  // =========================
  // 🔄 REFRESH SESSIONS
  // =========================
  React.useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>🧠 NeuroMind</Text>

      {/* NEW CHAT */}
      <TouchableOpacity
        onPress={() => {
          navigation.navigate("Chat", { newChat: true });
          navigation.closeDrawer();
        }}
        style={styles.newChat}
      >
        <Text style={styles.newChatText}>+ New Chat</Text>
      </TouchableOpacity>

      {/* CHAT HISTORY */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.sessionId}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No chats yet</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Chat", {
                sessionId: item.sessionId,
              });
              navigation.closeDrawer();
            }}
            style={styles.session}
          >
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {item.title || "New Chat"}
            </Text>

            {!!item.lastMessage && (
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Mood")}
        >
          <Text style={styles.footerItem}>😊 Mood Tracker</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==============================
// 🧭 DRAWER NAVIGATOR
// ==============================
export default function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#0f172a",
          width: 280,
        },
      }}
      drawerContent={(props) => (
        <CustomDrawerContent {...props} />
      )}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
}

// ==============================
// 🎨 STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },

  newChat: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },

  newChatText: {
    color: "#fff",
    fontWeight: "bold",
  },

  session: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },

  sessionTitle: {
    color: "#e2e8f0",
    fontWeight: "600",
  },

  preview: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },

  empty: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
  },

  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
  },

  footerItem: {
    color: "#94a3b8",
    marginBottom: 12,
  },

  logout: {
    color: "#ef4444",
    fontWeight: "bold",
  },
});