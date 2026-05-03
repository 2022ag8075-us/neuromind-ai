import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
} from "react-native";
import * as Clipboard from "expo-clipboard";

/* =========================
   TYPES
========================= */
interface Props {
  text: string;
  isUser?: boolean;
  time?: string;
  status?: "sending" | "sent" | "error";

  showAvatar?: boolean;
  failed?: boolean;
  onRetry?: () => void;

  /* 🔥 STREAMING SUPPORT */
  isStreaming?: boolean;
}

/* =========================
   COMPONENT
========================= */
function ChatBubble({
  text,
  isUser = false,
  time,
  status,
  showAvatar = false,
  failed = false,
  onRetry,
  isStreaming = false,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const [displayText, setDisplayText] = useState(text);
  const prevText = useRef(text);

  /* =========================
     ENTRY ANIMATION
  ========================= */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* =========================
     STREAMING ENGINE
     (token-by-token safe sync)
  ========================= */
  useEffect(() => {
    if (text !== prevText.current) {
      prevText.current = text;

      if (!isStreaming) {
        setDisplayText(text);
        return;
      }

      // smooth streaming effect
      let i = 0;
      const interval = setInterval(() => {
        i++;

        setDisplayText(text.slice(0, i));

        if (i >= text.length) {
          clearInterval(interval);
        }
      }, 10); // adjust speed (lower = faster typing)

      return () => clearInterval(interval);
    }
  }, [text, isStreaming]);

  /* =========================
     COPY HANDLER
  ========================= */
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(displayText);
    } catch {}
  };

  /* =========================
     STATUS ICON
  ========================= */
  const renderStatus = () => {
    if (!isUser || !status) return null;

    switch (status) {
      case "sending":
        return <Text style={styles.status}>⏳</Text>;
      case "sent":
        return <Text style={styles.status}>✓✓</Text>;
      case "error":
        return <Text style={styles.statusError}>⚠</Text>;
      default:
        return null;
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowRight : styles.rowLeft,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* AVATAR */}
      {!isUser && showAvatar && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}

      {/* BUBBLE */}
      <Pressable
        onLongPress={handleCopy}
        onPress={() => failed && onRetry?.()}
        android_ripple={{ color: "#ffffff10" }}
        style={({ pressed }) => [
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          pressed && styles.pressed,
          failed && styles.failedBubble,
        ]}
      >
        {/* TEXT */}
        <Text style={styles.text}>
          {displayText}
          {isStreaming && <Text style={styles.cursor}>▍</Text>}
        </Text>

        {/* FOOTER */}
        <View style={styles.footer}>
          {!!time && (
            <Text
              style={[
                styles.time,
                isUser ? styles.userTime : styles.aiTime,
              ]}
            >
              {time}
            </Text>
          )}

          {renderStatus()}
        </View>

        {/* RETRY */}
        {failed && (
          <Text style={styles.retryText}>
            Tap to retry
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* =========================
   MEMO OPTIMIZATION
========================= */
export default memo(ChatBubble);

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginVertical: 4,
    alignItems: "flex-end",
  },

  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  avatarText: { fontSize: 12 },

  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },

  userBubble: {
    backgroundColor: "#4F46E5",
    borderBottomRightRadius: 6,
  },

  aiBubble: {
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 6,
  },

  failedBubble: {
    borderWidth: 1,
    borderColor: "#f59e0b",
  },

  pressed: { opacity: 0.85 },

  text: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },

  cursor: {
    color: "#94a3b8",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 6,
  },

  time: { fontSize: 10, marginRight: 6 },

  userTime: { color: "#e0e7ff" },
  aiTime: { color: "#94a3b8" },

  status: { fontSize: 10, color: "#e0e7ff" },
  statusError: { fontSize: 10, color: "#f87171" },

  retryText: {
    marginTop: 4,
    fontSize: 11,
    color: "#f59e0b",
  },
});