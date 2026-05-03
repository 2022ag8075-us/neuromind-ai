import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Image,
  Alert,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";

import API from "../services/api";
import ChatBubble from "../components/ChatBubble";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

/* ============================== */
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

/* ============================== */
type Status = "sending" | "sent" | "error";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: Status;
}

/* ============================== */
const getTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/* ============================== */
export default function ChatScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { activeSessionId, selectSession } = useChat();

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [image, setImage] = useState<any>(null);
  const [recording, setRecording] =
    useState<Audio.Recording | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);
  const currentSessionRef = useRef<string | null>(null);

  /* ============================== */
  const safeSetChat = useCallback(
    (fn: (prev: Message[]) => Message[]) => {
      if (!isMounted.current) return;
      setChat(fn);
    },
    []
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* ============================== */
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  /* ============================== */
  const loadMessages = useCallback(async () => {
    if (!activeSessionId) return;

    currentSessionRef.current = activeSessionId;
    setInitialLoading(true);

    try {
      const res = await API.get(
        `/chat/messages/${activeSessionId}`
      );

      // prevent race overwrite
      if (currentSessionRef.current !== activeSessionId)
        return;

      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      // ✅ sort messages properly
      const sorted = raw.sort(
        (a: any, b: any) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );

      // ✅ stable IDs (NO _id in schema)
      const formatted: Message[] = sorted.map(
        (m: any, index: number) => ({
          id: `${m.createdAt || Date.now()}_${index}`,
          text: m.content || "",
          isUser: m.role === "user",
          time: new Date(
            m.createdAt || Date.now()
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })
      );

      safeSetChat(() => formatted);
    } catch {
      Alert.alert("Error", "Failed to load chats");
    } finally {
      setInitialLoading(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  /* ============================== */
  useEffect(() => {
    if (chat.length > 0) scrollToBottom();
  }, [chat]);

  /* ============================== */
  const pickImage = async () => {
    try {
      const res =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });

      if (!res.canceled && res.assets?.length) {
        setImage(res.assets[0]);
      }
    } catch {
      Alert.alert("Error", "Image pick failed");
    }
  };

  /* ============================== */
  const startRecording = async () => {
    try {
      const perm =
        await Audio.requestPermissionsAsync();

      if (!perm.granted) {
        Alert.alert("Permission required");
        return;
      }

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      await rec.startAsync();
      setRecording(rec);
    } catch {}
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);

      if (uri) sendMessage("", uri, null);
    } catch {}
  };

  /* ============================== */
  const sendMessage = async (
    text: string,
    audioUri?: string | null,
    imageObj?: any
  ) => {
    if (loading) return;
    if (!text && !audioUri && !imageObj) return;

    const id = generateId();

    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );

    safeSetChat((prev) => [
      ...prev,
      {
        id,
        text: text || "📎 Media",
        isUser: true,
        time: getTime(),
        status: "sending",
      },
    ]);

    setLoading(true);

    try {
      const form = new FormData();

      if (text) form.append("message", text);
      if (activeSessionId)
        form.append("sessionId", activeSessionId);

      if (audioUri) {
        form.append("files", {
          uri: audioUri,
          name: "audio.m4a",
          type: "audio/m4a",
        } as any);
      }

      if (imageObj) {
        form.append("files", {
          uri: imageObj.uri,
          name: "image.jpg",
          type: "image/jpeg",
        } as any);
      }

      const res = await API.post(
        "/ai/unified-chat",
        form,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      const reply =
        res.data?.reply || "I'm here for you.";

      safeSetChat((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "sent" }
            : m
        )
      );

      safeSetChat((prev) => [
        ...prev,
        {
          id: generateId(),
          text: reply,
          isUser: false,
          time: getTime(),
        },
      ]);

      // ✅ ALWAYS sync session
      if (res.data?.sessionId) {
        selectSession(res.data.sessionId);
      }

      setImage(null);
    } catch {
      safeSetChat((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "error" }
            : m
        )
      );

      Alert.alert("Error", "Message failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text && !image) return;

    setMessage("");
    sendMessage(text, null, image);
  };

  /* ============================== */
  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <BlurView intensity={50} tint="dark">
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                navigation.openDrawer()
              }
            >
              <Text style={styles.menu}>☰</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              NeuroMind
            </Text>

            <TouchableOpacity onPress={logout}>
              <Text style={styles.logout}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        {initialLoading && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={chat}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble {...item} />
          )}
          contentContainerStyle={styles.chat}
          onContentSizeChange={scrollToBottom}
        />

        {image && (
          <View style={styles.preview}>
            <Image
              source={{ uri: image.uri }}
              style={styles.previewImg}
            />
            <TouchableOpacity
              onPress={() => setImage(null)}
            >
              <Text style={styles.remove}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.typing}>
            <ActivityIndicator />
            <Text style={styles.typingText}>
              AI thinking...
            </Text>
          </View>
        )}

        <BlurView style={styles.inputBox} intensity={60}>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.icon}>🖼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={
              recording
                ? stopRecording
                : startRecording
            }
          >
            <Text style={styles.icon}>
              {recording ? "⏹" : "🎤"}
            </Text>
          </TouchableOpacity>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type..."
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <TouchableOpacity onPress={handleSend}>
            <Text style={styles.send}>➤</Text>
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/* ============================== */
const styles = StyleSheet.create({
  header: {
    padding: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  menu: { color: "#fff", fontSize: 20 },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  logout: { color: "#ef4444" },

  chat: {
    padding: 24,
    paddingBottom: 120,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  typing: {
    flexDirection: "row",
    padding: 10,
  },

  typingText: {
    color: "#aaa",
    marginLeft: 8,
  },

  inputBox: {
    position: "absolute",
    bottom: 0,
    width: "98%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 7,
  },

  send: {
    color: "#3b82f6",
    fontSize: 22,
  },

  icon: {
    fontSize: 20,
    marginHorizontal: 6,
    color: "#fff",
  },

  preview: {
    padding: 10,
  },

  previewImg: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },

  remove: {
    color: "#ef4444",
    marginTop: 6,
  },
});