import React, { memo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";

// ==============================
// TYPES
// ==============================
interface Session {
  sessionId: string;
  title?: string;
  lastMessage?: string;
}

interface Props {
  sessions: Session[];
  activeSession: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

// ==============================
// HELPERS
// ==============================
const getTitle = (session: Session) => {
  if (session.title?.trim()) return session.title;

  if (session.lastMessage) {
    return session.lastMessage.slice(0, 25);
  }

  return "New Chat";
};

// ==============================
// COMPONENT
// ==============================
function ChatSidebar({
  sessions,
  activeSession,
  onSelect,
  onNewChat,
}: Props) {
  // =========================
  // 🎯 RENDER ITEM (OPTIMIZED)
  // =========================
  const renderItem = useCallback(
    ({ item }: { item: Session }) => {
      const isActive = activeSession === item.sessionId;

      return (
        <TouchableOpacity
          onPress={() => onSelect(item.sessionId)}
          activeOpacity={0.7}
          style={[
            styles.sessionItem,
            isActive && styles.activeSession,
          ]}
        >
          {/* TITLE */}
          <Text style={styles.title} numberOfLines={1}>
            {getTitle(item)}
          </Text>

          {/* LAST MESSAGE */}
          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeSession, onSelect]
  );

  // =========================
  // EMPTY COMPONENT
  // =========================
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No conversations yet 💬
      </Text>
      <Text style={styles.emptySub}>
        Start a new chat to begin
      </Text>
    </View>
  );

  // =========================
  // UI
  // =========================
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.heading}>Chats</Text>
      </View>

      {/* NEW CHAT BUTTON */}
      <TouchableOpacity
        onPress={onNewChat}
        activeOpacity={0.85}
        style={styles.newChatBtn}
      >
        <Text style={styles.newChatText}>＋ New Chat</Text>
      </TouchableOpacity>

      {/* SESSION LIST */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.sessionId}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          sessions.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

// ==============================
// EXPORT (MEMO OPTIMIZED)
// ==============================
export default memo(ChatSidebar);

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  /* =========================
     CONTAINER
  ========================= */
  container: {
    width: 280,
    backgroundColor: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
  },

  /* =========================
     HEADER
  ========================= */
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
  },

  heading: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
  },

  /* =========================
     NEW CHAT BUTTON
  ========================= */
  newChatBtn: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#38bdf8",
    alignItems: "center",

    // shadow
    elevation: 3,
  },

  newChatText: {
    color: "#020617",
    fontWeight: "700",
    fontSize: 14,
  },

  /* =========================
     LIST
  ========================= */
  list: {
    paddingTop: 4,
    paddingBottom: 20,
  },

  /* =========================
     EMPTY STATE
  ========================= */
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },

  emptySub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },

  /* =========================
     SESSION ITEM
  ========================= */
  sessionItem: {
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 12,
    borderRadius: 14,
  },

  activeSession: {
    backgroundColor: "#1e293b",
  },

  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  preview: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
});