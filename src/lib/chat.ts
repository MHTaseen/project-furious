import fs from "fs";
import path from "path";

export interface ChatAttachment {
  id: string;
  type: "image" | "video" | "audio" | "file";
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "admin" | "guest";
  text: string;
  attachments: ChatAttachment[];
  createdAt: string;
}

export interface ChatConversation {
  id: string; // usually customer userId or guest session id
  customerName: string;
  customerPhone?: string;
  customerRole: "customer" | "guest";
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet: string;
  unreadForAdmin: number;
  unreadForCustomer: number;
}

export interface ChatStore {
  conversations: Record<string, ChatConversation>;
  messages: ChatMessage[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");
export const CHAT_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "chat");

function ensureChatStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
    fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHAT_FILE)) {
    const initial: ChatStore = {
      conversations: {},
      messages: [],
    };
    fs.writeFileSync(CHAT_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

export function readChatStore(): ChatStore {
  ensureChatStorage();
  try {
    const raw = fs.readFileSync(CHAT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      conversations: parsed.conversations || {},
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return { conversations: {}, messages: [] };
  }
}

export function writeChatStore(store: ChatStore): void {
  ensureChatStorage();
  fs.writeFileSync(CHAT_FILE, JSON.stringify(store, null, 2), "utf8");
}

