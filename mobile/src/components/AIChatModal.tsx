import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { AI_URL } from "../config/api";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

const QUICK_PROMPTS = [
  "Rekomendasi makanan pedas",
  "Minuman dingin yang segar",
  "Menu hemat di bawah Rp 25.000",
];

export default function AIChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Halo! Saya Nexus AI Assistant 🤖\nAda yang bisa saya bantu tentang pilihan menu hari ini?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [isOpen, messages]);

  const handleSend = (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isStreaming) return;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    const userMessage: Message = { id: userMsgId, sender: "user", text: textToSend };
    const initialAiMessage: Message = { id: aiMsgId, sender: "ai", text: "" };

    setMessages((prev) => [...prev, userMessage, initialAiMessage]);
    setInput("");
    setIsStreaming(true);

    // Call Python FastAPI SSE Chat Endpoint
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${AI_URL}/chat`);
    xhr.setRequestHeader("Content-Type", "application/json");

    let processedLength = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newResponseText = xhr.responseText.substring(processedLength);
        processedLength = xhr.responseText.length;

        const lines = newResponseText.split("\n");
        let accumulatedTokens = "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawToken = line.slice(6);
            if (rawToken.trim() === "[DONE]") {
              setIsStreaming(false);
            } else if (rawToken && !rawToken.trim().startsWith("[ERROR]")) {
              accumulatedTokens += rawToken;
            }
          }
        }

        if (accumulatedTokens) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, text: msg.text + accumulatedTokens } : msg
            )
          );
        }
      }

      if (xhr.readyState === 4) {
        setIsStreaming(false);
      }
    };

    xhr.onerror = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: "Maaf, terjadi kesalahan koneksi ke AI Assistant." }
            : msg
        )
      );
      setIsStreaming(false);
    };

    xhr.send(
      JSON.stringify({
        message: textToSend,
        session_id: `mobile-session-${Date.now()}`,
      })
    );
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)}>
        <Text style={styles.fabIcon}>🤖</Text>
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>AI</Text>
        </View>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View className="flex-row items-center">
                <Text style={styles.headerTitle}>Nexus AI Assistant</Text>
                <View style={styles.statusDot} />
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsOpen(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>Powered by RAG • Mistral Local LLM</Text>

            {/* Quick Prompts */}
            <View style={styles.quickPromptsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.promptChip}
                    onPress={() => handleSend(prompt)}
                    disabled={isStreaming}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Messages ScrollView */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.sender === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === "user" ? styles.userMessageText : styles.aiMessageText,
                    ]}
                  >
                    {msg.text || (msg.sender === "ai" && isStreaming ? "Mengetik..." : "")}
                  </Text>
                </View>
              ))}
              {isStreaming && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#533afd" />
                  <Text style={styles.loadingText}>Mencari menu & berpikir...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Tanyakan menu, rekomendasi, dll..."
                placeholderTextColor="#94a3b8"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => handleSend()}
                editable={!isStreaming}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={!input.trim() || isStreaming}
              >
                <Text style={styles.sendBtnText}>Kirim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#533afd",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
  fabIcon: {
    fontSize: 28,
  },
  fabBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ea2261",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fabBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 37, 61, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: "#0d253d",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    color: "#64748b",
  },
  quickPromptsContainer: {
    marginBottom: 12,
  },
  promptChip: {
    backgroundColor: "#f6f9fc",
    borderWidth: 1,
    borderColor: "#e3e8ee",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  promptChipText: {
    fontSize: 13,
    color: "#533afd",
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#533afd",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f6f9fc",
    borderWidth: 1,
    borderColor: "#e3e8ee",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#ffffff",
  },
  aiMessageText: {
    color: "#0d253d",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e3e8ee",
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#f6f9fc",
    borderWidth: 1,
    borderColor: "#e3e8ee",
    borderRadius: 100,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#0d253d",
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: "#533afd",
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
});
