import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { verifySessionToken } from "@/lib/auth";
import {
  readChatStore,
  writeChatStore,
  ChatMessage,
  ChatConversation,
} from "@/lib/chat";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(req.url);
    const conversationIdParam = searchParams.get("conversationId");

    const noCacheHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    const markReadParam = searchParams.get("markRead") === "true";
    const store = readChatStore();

    // If admin is requesting, they can see conversation list or a specific conversation
    if (user && user.role === "admin") {
      const convList = Object.values(store.conversations).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const targetConvId = conversationIdParam || convList[0]?.id;

      // If viewing the conversation with markRead, clear unread count for admin
      if (markReadParam && targetConvId && store.conversations[targetConvId]) {
        if ((store.conversations[targetConvId].unreadForAdmin || 0) > 0) {
          store.conversations[targetConvId].unreadForAdmin = 0;
          writeChatStore(store);
          // update in local convList too
          const cIdx = convList.findIndex((c) => c.id === targetConvId);
          if (cIdx !== -1) convList[cIdx].unreadForAdmin = 0;
        }
      }

      const messages = targetConvId
        ? store.messages.filter((m) => m.conversationId === targetConvId)
        : [];

      return NextResponse.json(
        {
          isAdmin: true,
          conversations: convList,
          activeConversationId: targetConvId || null,
          messages,
        },
        { headers: noCacheHeaders }
      );
    }

    // Customer or Guest request
    // Security Isolation: Registered customer can ONLY view their own conversation
    // Guest can ONLY access conversations with their own guest ID (must start with "guest-")
    let convId: string;
    if (user) {
      convId = user.id;
    } else {
      // Must be a valid guest identifier
      if (conversationIdParam && conversationIdParam.startsWith("guest-")) {
        convId = conversationIdParam;
      } else {
        convId = `guest-temp-${Date.now()}`;
      }
    }

    // If customer/guest is viewing their chat with markRead, clear unread count for customer
    if (markReadParam && store.conversations[convId]) {
      if ((store.conversations[convId].unreadForCustomer || 0) > 0) {
        store.conversations[convId].unreadForCustomer = 0;
        writeChatStore(store);
      }
    }

    const conversation = store.conversations[convId] || null;
    const messages = store.messages.filter((m) => m.conversationId === convId);

    return NextResponse.json(
      {
        isAdmin: false,
        conversationId: convId,
        conversation,
        messages,
      },
      { headers: noCacheHeaders }
    );
  } catch (err) {
    console.error("Chat GET error:", err);
    return NextResponse.json({ error: "Failed to load chat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = await req.json();
    const {
      conversationId,
      text = "",
      attachments = [],
      senderName,
      customerPhone,
    } = body;

    const store = readChatStore();
    const nowIso = new Date().toISOString();

    let targetConvId = conversationId;
    let role: "customer" | "admin" | "guest" = "guest";
    let name = senderName?.trim() || "Guest Customer";
    let senderId = "guest";

    if (user) {
      if (user.role === "admin") {
        role = "admin";
        name = user.name || "Furious Admin";
        senderId = user.id;
        if (!targetConvId) {
          return NextResponse.json(
            { error: "Admin must specify conversationId." },
            { status: 400 }
          );
        }
      } else {
        role = "customer";
        name = user.name || "Customer";
        senderId = user.id;
        targetConvId = user.id;
      }
    } else {
      if (!targetConvId) {
        targetConvId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      }
      senderId = targetConvId;
    }

    if (!text.trim() && (!Array.isArray(attachments) || attachments.length === 0)) {
      return NextResponse.json(
        { error: "Cannot send an empty message." },
        { status: 400 }
      );
    }

    // Ensure conversation exists
    let conv = store.conversations[targetConvId];
    if (!conv) {
      conv = {
        id: targetConvId,
        customerName: role === "admin" ? "Customer" : name,
        customerPhone: customerPhone || "",
        customerRole: role === "customer" ? "customer" : "guest",
        createdAt: nowIso,
        updatedAt: nowIso,
        lastMessageSnippet: text || "Sent an attachment",
        unreadForAdmin: role === "admin" ? 0 : 1,
        unreadForCustomer: role === "admin" ? 1 : 0,
      };
    } else {
      conv.updatedAt = nowIso;
      if (role !== "admin") {
        conv.customerName = name || conv.customerName;
        if (customerPhone) conv.customerPhone = customerPhone;
        conv.unreadForAdmin = (conv.unreadForAdmin || 0) + 1;
      } else {
        conv.unreadForCustomer = (conv.unreadForCustomer || 0) + 1;
      }
      conv.lastMessageSnippet =
        text.trim() ||
        (attachments.length > 0 ? `Sent ${attachments.length} attachment(s)` : "");
    }
    store.conversations[targetConvId] = conv;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId: targetConvId,
      senderId,
      senderName: name,
      senderRole: role,
      text: text.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: nowIso,
    };

    store.messages.push(newMessage);
    writeChatStore(store);

    return NextResponse.json({
      success: true,
      message: newMessage,
      conversationId: targetConvId,
    });
  } catch (err) {
    console.error("Chat POST error:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}

// DELETE: Admin can delete specific messages or entire conversation history to preserve storage
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can delete chat messages to manage storage." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    const conversationId = searchParams.get("conversationId");

    const store = readChatStore();

    if (messageId) {
      // Find message to remove its files from disk
      const msgToDelete = store.messages.find((m) => m.id === messageId);
      if (msgToDelete?.attachments?.length) {
        msgToDelete.attachments.forEach((att) => {
          try {
            if (att.url.startsWith("/uploads/chat/")) {
              const fname = path.basename(att.url);
              const fpath = path.join(process.cwd(), "public", "uploads", "chat", fname);
              if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
            }
          } catch {
            // ignore disk cleanup errors
          }
        });
      }

      store.messages = store.messages.filter((m) => m.id !== messageId);
      writeChatStore(store);
      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    if (conversationId) {
      // Delete all messages in conversation and their files
      const convMessages = store.messages.filter(
        (m) => m.conversationId === conversationId
      );
      convMessages.forEach((msg) => {
        msg.attachments?.forEach((att) => {
          try {
            if (att.url.startsWith("/uploads/chat/")) {
              const fname = path.basename(att.url);
              const fpath = path.join(process.cwd(), "public", "uploads", "chat", fname);
              if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
            }
          } catch {
            // ignore disk cleanup error
          }
        });
      });

      store.messages = store.messages.filter(
        (m) => m.conversationId !== conversationId
      );
      delete store.conversations[conversationId];
      writeChatStore(store);

      return NextResponse.json({
        success: true,
        deletedConversationId: conversationId,
      });
    }

    return NextResponse.json(
      { error: "Must provide messageId or conversationId to delete." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Chat DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete message/conversation." },
      { status: 500 }
    );
  }
}

// PATCH: Mark conversation as read (clears unread badge / red dot for user or admin)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = await req.json();
    const { conversationId } = body;

    const store = readChatStore();
    let updated = false;

    if (user && user.role === "admin") {
      const targetId = conversationId || Object.keys(store.conversations)[0];
      if (targetId && store.conversations[targetId]) {
        if ((store.conversations[targetId].unreadForAdmin || 0) > 0) {
          store.conversations[targetId].unreadForAdmin = 0;
          updated = true;
        }
      }
    } else {
      const convId = user ? user.id : conversationId;
      if (convId && store.conversations[convId]) {
        if ((store.conversations[convId].unreadForCustomer || 0) > 0) {
          store.conversations[convId].unreadForCustomer = 0;
          updated = true;
        }
      }
    }

    if (updated) {
      writeChatStore(store);
    }

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("Chat PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to mark conversation as read." },
      { status: 500 }
    );
  }
}

