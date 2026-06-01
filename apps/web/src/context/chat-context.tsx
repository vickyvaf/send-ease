"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAccount } from "wagmi";

export interface Message {
  role: "user" | "bot";
  content: string;
  isError?: boolean;
  actionData?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  deleteSession: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_SESSIONS_BASE_KEY = "sendease_chat_sessions";
const getChatSessionsKey = (address: string | undefined) => {
  if (address) {
    return `${CHAT_SESSIONS_BASE_KEY}_${address.toLowerCase()}`;
  }
  return CHAT_SESSIONS_BASE_KEY;
};

const INITIAL_BOT_MESSAGE = "Hi! I'm your Sendease Assistant. I can help you schedule a stablecoin remittance on Celo. Try saying: \"Kirim 100 USDm ke Ana tiap tanggal 1\". How can I help you today?";

export function ChatProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: INITIAL_BOT_MESSAGE }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const key = getChatSessionsKey(address);
    const savedSessions = localStorage.getItem(key);
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse chat sessions", e);
      }
    } else {
      setSessions([]);
    }

    setCurrentSessionId(null);
    setMessages([
      { role: "bot", content: INITIAL_BOT_MESSAGE }
    ]);
  }, [address]);

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    const key = getChatSessionsKey(address);
    localStorage.setItem(key, JSON.stringify(updated));
    
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setMessages([
        { role: "bot", content: INITIAL_BOT_MESSAGE }
      ]);
    }
  };

  useEffect(() => {
    if (messages.length > 1) {
      const firstUserMsg = messages.find(m => m.role === "user")?.content || "New Chat";
      const title = firstUserMsg.length > 30 ? firstUserMsg.substring(0, 30) + "..." : firstUserMsg;
      
      const sessionId = currentSessionId || Date.now().toString();
      
      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
      }

      const sessionData: ChatSession = {
        id: sessionId,
        title,
        messages,
        updatedAt: Date.now()
      };

      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== sessionId);
        const updated = [sessionData, ...filtered];
        const key = getChatSessionsKey(address);
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    }
  }, [messages, currentSessionId, address]);

  return (
    <ChatContext.Provider value={{ 
      messages, 
      setMessages, 
      currentSessionId, 
      setCurrentSessionId,
      sessions,
      setSessions,
      deleteSession
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
