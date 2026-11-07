"use client";

import React, { useEffect, useRef, useState } from "react";

interface ChatAttachment {
  id: string;
  type: "image" | "video" | "audio" | "file";
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "admin" | "guest";
  text: string;
  attachments: ChatAttachment[];
  createdAt: string;
}

interface ChatConversation {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerRole: "customer" | "guest";
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet: string;
  unreadForAdmin: number;
  unreadForCustomer: number;
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string; phone?: string } | null>(null);

  // Guest identification persisted in localStorage
  const [guestId, setGuestId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");

  // Chat data
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Unread badge count
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize guest identity from localStorage
  useEffect(() => {
    let gid = localStorage.getItem("furious_guest_id");
    if (!gid) {
      gid = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem("furious_guest_id", gid);
    }
    setGuestId(gid);
    setGuestName(localStorage.getItem("furious_guest_name") || "");
    setGuestPhone(localStorage.getItem("furious_guest_phone") || "");
  }, []);

  // Fetch current user auth state
  const loadUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
        setIsAdmin(data.user.role === "admin");
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUser();
    const handleAuth = () => loadUser();
    window.addEventListener("furious-auth-change", handleAuth);
    return () => window.removeEventListener("furious-auth-change", handleAuth);
  }, []);

  // Mark conversation as read (clears unread badge on server & client)
  const markAsRead = async (targetConvId?: string) => {
    try {
      const idToMark =
        targetConvId || (isAdmin ? activeConversationId : (user ? user.id : guestId));
      if (!idToMark) return;

      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: idToMark }),
      });

      if (isAdmin) {
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === idToMark ? { ...c, unreadForAdmin: 0 } : c
          );
          const totalUnread = updated.reduce(
            (acc, c) => acc + (c.unreadForAdmin || 0),
            0
          );
          setUnreadCount(totalUnread);
          return updated;
        });
      } else {
        setUnreadCount(0);
      }
    } catch {
      // ignore
    }
  };

  // Poll / fetch chat messages
  const fetchChat = async () => {
    try {
      const targetConv = isAdmin ? activeConversationId : (user ? user.id : guestId);
      const params = new URLSearchParams();
      if (targetConv) params.set("conversationId", targetConv);
      if (isOpen) params.set("markRead", "true");

      const url = `/api/chat?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.isAdmin) {
        setIsAdmin(true);
        if (Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          // If chat is open and active conversation is selected, its unread is already 0
          const totalUnread = data.conversations.reduce(
            (acc: number, c: ChatConversation) =>
              acc + (isOpen && c.id === activeConversationId ? 0 : (c.unreadForAdmin || 0)),
            0
          );
          setUnreadCount(totalUnread);
        }
        if (!activeConversationId && data.activeConversationId) {
          setActiveConversationId(data.activeConversationId);
        }
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } else {
        setIsAdmin(false);
        if (data.conversation) {
          // If chat is open, user is actively viewing it -> 0 unread
          if (isOpen) {
            setUnreadCount(0);
          } else {
            setUnreadCount(data.conversation.unreadForCustomer || 0);
          }
        }
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch {
      // ignore poll error
    }
  };

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 4000); // Live poll every 4s like WhatsApp/Messenger
    return () => clearInterval(interval);
  }, [isAdmin, activeConversationId, user, guestId, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (attachments: ChatAttachment[] = []) => {
    if (!inputText.trim() && attachments.length === 0) return;

    const targetConv = isAdmin
      ? activeConversationId
      : (user ? user.id : guestId);

    if (!targetConv) return;

    const payload = {
      conversationId: targetConv,
      text: inputText.trim(),
      attachments,
      senderName: user ? user.name : (guestName.trim() || "Customer"),
      customerPhone: user ? user.phone : guestPhone.trim(),
    };

    setInputText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        if (!isAdmin && data.conversationId) {
          setGuestId(data.conversationId);
          localStorage.setItem("furious_guest_id", data.conversationId);
        }
        fetchChat();
      }
    } catch {
      // ignore
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedAttachments: ChatAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Size limit: 100MB
      if (file.size > 100 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the maximum allowed size of 100MB.`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.attachment) {
          uploadedAttachments.push(data.attachment);
        } else {
          alert(data.error || "Failed to upload file.");
        }
      } catch {
        alert("Network error uploading file.");
      }
    }

    setUploading(false);
    e.target.value = "";

    if (uploadedAttachments.length > 0) {
      await handleSendMessage(uploadedAttachments);
    }
  };

  // Voice Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick supported mimeType for cross-platform playback (Chrome, Safari, Edge, Mobile)
      let mimeType = "audio/webm";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const rawType = recorder.mimeType || mimeType || "audio/webm";
        const cleanExt = rawType.includes("mp4")
          ? ".mp4"
          : rawType.includes("ogg")
          ? ".ogg"
          : ".webm";

        const audioBlob = new Blob(audioChunks, { type: rawType });
        if (audioBlob.size > 100 * 1024 * 1024) {
          alert("Audio recording exceeds 100MB limit.");
          return;
        }

        const formData = new FormData();
        formData.append("file", audioBlob, `voice-msg-${Date.now()}${cleanExt}`);

        setUploading(true);
        try {
          const res = await fetch("/api/chat/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (res.ok && data.attachment) {
            await handleSendMessage([data.attachment]);
          }
        } catch {
          alert("Failed to upload voice message.");
        } finally {
          setUploading(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      // Request data slices every 1s so chunks are written smoothly
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Admin delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this message and free storage?")) return;

    try {
      const res = await fetch(`/api/chat?messageId=${encodeURIComponent(msgId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch {
      // ignore
    }
  };

  // Admin delete entire conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!confirm("Delete entire chat with this customer and remove all audio/video/images to free space?")) return;

    try {
      const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(convId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          setActiveConversationId("");
          setMessages([]);
        }
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (Always Fixed at bottom-right corner across all pages) */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            const nextOpen = !isOpen;
            setIsOpen(nextOpen);
            if (nextOpen) {
              markAsRead();
              setUnreadCount(0);
            }
          }}
          aria-label="Open Furious Messenger"
          title="Furious Live Chat / Messenger"
          style={{
            backgroundColor: "#111114",
            border: "1.5px solid rgba(255, 30, 39, 0.75)",
            boxShadow:
              "0 0 20px rgba(255, 30, 39, 0.45), inset 0 1px 2px rgba(125, 249, 255, 0.25)",
          }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-glossy-gold hover:scale-105 active:scale-95 transition-all cursor-pointer group relative"
        >
          {/* Pulsing Red Ring indicator — ONLY WHEN UNREAD MESSAGES EXIST & CHAT IS CLOSED */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -inset-1 rounded-full border border-[#FF1E27]/50 animate-ping opacity-35 pointer-events-none" />
          )}

          {/* Unread Badge / Red Dot — ONLY WHEN UNREAD MESSAGES EXIST & CHAT IS CLOSED */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FF1E27] text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/40">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}

          {isOpen ? (
            <span className="text-xl sm:text-2xl font-bold text-white">✕</span>
          ) : (
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 fill-[#FF1E27] group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.513 3.734 7.218-.163 1.344-.652 3.013-1.636 4.316a.5.5 0 0 0 .524.814c2.316-.484 4.312-1.464 5.37-2.072.65.12 1.32.184 2.008.184 5.523 0 10-4.145 10-9.26S17.523 2 12 2zm1.09 12.355l-2.486-2.653-4.85 2.653 5.334-5.66 2.535 2.653 4.801-2.653-5.334 5.66z" />
            </svg>
          )}
        </button>
      </div>

      {/* FLOATING CHAT POPUP WINDOW (Messenger / WhatsApp layout) */}
      {isOpen && (
        <div
          style={{
            backgroundColor: "#0D0D10",
            border: "1.5px solid rgba(255, 30, 39, 0.65)",
            boxShadow:
              "0 0 45px rgba(255, 30, 39, 0.25), 0 25px 60px rgba(0, 0, 0, 0.9)",
          }}
          className="fixed bottom-24 right-4 sm:right-6 z-[998] w-[92vw] sm:w-[420px] lg:w-[480px] h-[580px] max-h-[82vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all"
        >
          {/* CHAT HEADER */}
          <div
            style={{
              background:
                "linear-gradient(90deg, #181114 0%, #111114 50%, #151118 100%)",
              borderBottom: "1px solid rgba(255, 30, 39, 0.35)",
            }}
            className="p-3.5 sm:p-4 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1A1215] border border-[#FF1E27]/60 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-glossy-gold">𝔉</span>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-glossy-gold flex items-center gap-2">
                  {isAdmin ? "Admin Messenger" : "Furious Support"}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-gray-400">
                  {isAdmin
                    ? "Direct client conversations & storage manager"
                    : "Chat with shop admins (Audio, Video, Images up to 100MB)"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-[#141417] border border-[#00D4FF]/40 text-glossy-gold flex items-center justify-center text-xs hover:border-red-400 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* ADMIN CONVERSATIONS SWITCHER (if Admin) */}
          {isAdmin && (
            <div className="bg-[#141417] border-b border-[#00D4FF]/30 p-2 overflow-x-auto flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold text-glossy-gold px-1 shrink-0">
                Clients:
              </span>
              {conversations.length === 0 ? (
                <span className="text-xs text-gray-400">No client messages yet</span>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConversationId(c.id);
                      markAsRead(c.id);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                      activeConversationId === c.id
                        ? "bg-[#1A1215] border border-[#FF1E27] text-glossy-gold font-bold"
                        : "bg-[#0B0B0C] border border-[#00D4FF]/30 text-gray-300 hover:border-[#7DF9FF]"
                    }`}
                  >
                    <span>{c.customerName || "Customer"}</span>
                    {c.unreadForAdmin > 0 && (
                      <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                        {c.unreadForAdmin}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      title="Delete full chat with this customer to save storage"
                      className="ml-1 text-[10px] text-red-400 hover:text-red-200"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* GUEST IDENTITY PROMPT (Optional name/phone for non-logged in users) */}
          {!user && !isAdmin && (
            <div className="bg-[#141417] border-b border-[#00D4FF]/25 px-3 py-1.5 flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Your Name (Optional)"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  localStorage.setItem("furious_guest_name", e.target.value);
                }}
                className="auth-input flex-1 px-2 py-1 bg-[#0B0B0C] border border-[#00D4FF]/40 text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="Phone (Optional)"
                value={guestPhone}
                onChange={(e) => {
                  setGuestPhone(e.target.value);
                  localStorage.setItem("furious_guest_phone", e.target.value);
                }}
                className="auth-input w-28 px-2 py-1 bg-[#0B0B0C] border border-[#00D4FF]/40 text-xs focus:outline-none"
              />
            </div>
          )}

          {/* MESSAGES SCROLL CONTAINER */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#08080A]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#141417] border border-[#00D4FF]/30 flex items-center justify-center text-xl">
                  💬
                </div>
                <p className="text-xs uppercase tracking-wider text-glossy-gold font-bold">
                  Start Conversation
                </p>
                <p className="text-[11px] max-w-[260px]">
                  Send a text message, photo, audio recording, or video (up to 100MB per message) directly to Furious Moto Shop!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = isAdmin
                  ? msg.senderRole === "admin"
                  : msg.senderRole !== "admin";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">
                        {/* If message was sent by an admin and viewed by a client, show "ADMIN" anonymously */}
                        {msg.senderRole === "admin"
                          ? isAdmin
                            ? `ADMIN (${msg.senderName})`
                            : "ADMIN"
                          : msg.senderName}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {/* Admin Delete Message Button (to maintain website storage) */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message and files to free storage"
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-200 ml-1 transition-opacity"
                        >
                          ✕ Delete
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        backgroundColor: isMe ? "#1A1215" : "#141417",
                        border: isMe
                          ? "1px solid rgba(255, 30, 39, 0.55)"
                          : "1px solid rgba(0, 212, 255, 0.4)",
                      }}
                      className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm text-gray-100 leading-relaxed space-y-2 ${
                        isMe ? "rounded-tr-none" : "rounded-tl-none"
                      }`}
                    >
                      {/* Text content */}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      {/* Attachments: Images, Videos, Audios */}
                      {msg.attachments?.map((att) => (
                        <div key={att.id} className="pt-1">
                          {att.type === "image" && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-lg overflow-hidden border border-white/20 hover:opacity-95"
                            >
                              <img
                                src={att.url}
                                alt={att.filename}
                                className="max-h-56 w-auto object-cover rounded-lg"
                              />
                            </a>
                          )}

                          {att.type === "video" && (
                            <video
                              src={att.url}
                              controls
                              className="max-h-56 w-full rounded-lg bg-black border border-white/20"
                            />
                          )}

                          {att.type === "audio" && (
                            <div className="w-full min-w-[220px] max-w-[280px] bg-black/40 p-2 rounded-xl border border-white/15 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-gray-300">
                                <span className="flex items-center gap-1 font-semibold text-glossy-gold">
                                  🎵 Voice Note
                                </span>
                                <a
                                  href={att.url}
                                  download={att.filename}
                                  className="text-[10px] text-gray-400 hover:text-white underline"
                                >
                                  Download
                                </a>
                              </div>
                              <audio
                                src={att.url}
                                controls
                                preload="metadata"
                                className="w-full h-9 rounded"
                              />
                            </div>
                          )}

                          {att.type === "file" && (
                            <a
                              href={att.url}
                              download={att.filename}
                              className="inline-flex items-center gap-1.5 p-2 bg-black/40 rounded border border-white/20 text-xs text-glossy-gold hover:underline"
                            >
                              📎 {att.filename} ({(att.sizeBytes / 1024 / 1024).toFixed(1)}MB)
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT & ATTACHMENT CONTROLS */}
          <div
            style={{
              backgroundColor: "#111114",
              borderTop: "1px solid rgba(255, 30, 39, 0.35)",
            }}
            className="p-3 shrink-0 space-y-2"
          >
            {uploading && (
              <p className="text-[11px] text-glossy-gold animate-pulse text-center">
                Uploading media (up to 100MB)... please wait
              </p>
            )}

            <div className="flex items-center gap-2">
              {/* Media Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Send Image / Video / Audio / Document (Up to 100MB)"
                className="w-9 h-9 rounded-full bg-[#1A1215] border border-[#00D4FF]/45 hover:border-[#7DF9FF] text-glossy-gold flex items-center justify-center cursor-pointer shrink-0"
              >
                📎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Voice Record / Mic Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? "Stop recording & send" : "Record Voice Message"}
                className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                  isRecording
                    ? "bg-red-600 border-white text-white animate-pulse"
                    : "bg-[#1A1215] border-[#00D4FF]/45 hover:border-[#7DF9FF] text-glossy-gold"
                }`}
              >
                {isRecording ? "⏹" : "🎤"}
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder={
                  isRecording
                    ? "Recording voice... click stop to send"
                    : "Type a message..."
                }
                disabled={isRecording}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="auth-input flex-1 px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-xs sm:text-sm text-white rounded-full"
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={uploading || isRecording || !inputText.trim()}
                title="Send message"
                className="w-9 h-9 rounded-full bg-[#1A1215] border border-[#FF1E27]/70 hover:border-[#FF6B6B] text-glossy-gold flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-40"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
