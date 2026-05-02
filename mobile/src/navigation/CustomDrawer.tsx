import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";

import API from "../services/api";

interface Session {
  sessionId: string;
  title: string;
  lastMessage: string;
}

export default function CustomDrawer({ navigation }: any) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await API.get("/chat/sessions");
      setSessions(res.data.data || []);
    } catch (err) {
      console.log("Drawer session error:", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSelect = (id: string) => {
    setActive(id);

    navigation.navigate("Chat", {
      sessionId: id,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.newChat}
        onPress={() => navigation.navigate("Chat")}
      >
        <Text style={styles.newChatText}>+ New Chat</Text>
      </TouchableOpacity>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.sessionId}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item.sessionId)}
            style={[
              styles.item,
              active === item.sessionId && styles.activeItem,
            ]}
          >
            <Text style={styles.title}>
              {item.title || "New Chat"}
            </Text>

            <Text style={styles.subtitle} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: 50,
  },
  newChat: {
    margin: 12,
    padding: 12,
    backgroundColor: "#38bdf8",
    borderRadius: 10,
  },
  newChatText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  item: {
    padding: 12,
    margin: 6,
    borderRadius: 10,
  },
  activeItem: {
    backgroundColor: "#1e293b",
  },
  title: {
    color: "#fff",
    fontWeight: "600",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
});