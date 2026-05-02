import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";

import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ChatScreen from "../screens/ChatScreen";
import MoodScreen from "../screens/MoodScreen";
import LandingScreen from "../screens/LandingScreen";

import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

/**
 * ===============================
 * 🎯 CUSTOM DRAWER (CHATGPT STYLE)
 * ===============================
 */
function CustomDrawerContent(props: any) {
  const { navigation } = props;

  const { logout } = useAuth();
  const {
    sessions,
    selectSession,
    removeSession,
    fetchSessions,
  } = useChat();

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContainer}
    >
      {/* HEADER */}
      <Text style={styles.title}>🧠 NeuroMind</Text>

      {/* NEW CHAT */}
      <TouchableOpacity
        style={styles.newChatBtn}
        onPress={() => {
          selectSession(null);
          navigation.navigate("Chat", { newChat: true });
          navigation.closeDrawer();
        }}
      >
        <Text style={styles.newChatText}>➕ New Chat</Text>
      </TouchableOpacity>

      {/* CHAT HISTORY */}
      <Text style={styles.section}>Chats</Text>

      {sessions.map((s) => (
        <TouchableOpacity
          key={s.sessionId}
          style={styles.sessionItem}
          onPress={() => {
            selectSession(s.sessionId);
            navigation.navigate("Chat", {
              sessionId: s.sessionId,
            });
            navigation.closeDrawer();
          }}
          onLongPress={() => {
            Alert.alert(
              "Delete Chat",
              "Are you sure?",
              [
                { text: "Cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => removeSession(s.sessionId),
                },
              ]
            );
          }}
        >
          <Text style={styles.sessionText} numberOfLines={1}>
            {s.title || "New Chat"}
          </Text>
        </TouchableOpacity>
      ))}

      {/* MOOD */}
      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => {
          navigation.navigate("Mood");
          navigation.closeDrawer();
        }}
      >
        <Text style={styles.drawerText}>😊 Mood Tracker</Text>
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

/**
 * ===============================
 * 📱 DRAWER
 * ===============================
 */
function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#0f172a",
          width: 300,
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="Mood" component={MoodScreen} />
    </Drawer.Navigator>
  );
}

/**
 * ===============================
 * 🔐 AUTH STACK
 * ===============================
 */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

/**
 * ===============================
 * 🚀 MAIN NAVIGATOR
 * ===============================
 */
export default function AppNavigator() {
  const { isAuth, loading, refreshAuth } = useAuth();

  useEffect(() => {
    refreshAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loaderText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuth ? <AppDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
}

/**
 * ===============================
 * 🎨 STYLES
 * ===============================
 */
const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  loaderText: { color: "#fff", marginTop: 10 },

  drawerContainer: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: "#0f172a",
  },

  title: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  newChatBtn: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    marginBottom: 20,
  },

  newChatText: {
    color: "#fff",
    textAlign: "center",
  },

  section: {
    color: "#64748b",
    marginLeft: 16,
    marginBottom: 10,
  },

  sessionItem: {
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 8,
  },

  sessionText: {
    color: "#fff",
  },

  drawerItem: {
    padding: 16,
    marginTop: 20,
  },

  drawerText: {
    color: "#fff",
  },

  logoutBtn: {
    marginTop: 30,
    padding: 16,
  },

  logoutText: {
    color: "#ef4444",
    fontWeight: "600",
  },
});