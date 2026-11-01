import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySessionToken } from "@/lib/auth";
import { readProducts } from "@/lib/products";
import {
  BookingNotificationRecord,
  BookingReply,
  readBookings,
  writeBookings,
} from "@/lib/bookings";
import {
  parseNumericPrice,
  readSales,
  SoldProductRecord,
  writeSales,
} from "@/lib/sales";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const allBookings = readBookings();

  // Single booking lookup (for /notifications/[id] detail page)
  if (id) {
    const found = allBookings.find((b) => b.id === id);
    if (!found) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    return NextResponse.json({ booking: found }, { status: 200 });
  }

  // Admin gets all non-dismissed bell notifications + unread count
  if (user?.role === "admin") {
    const bellList = allBookings.filter((b) => !b.dismissedFromBell);
    const unreadCount = bellList.filter((b) => !b.seenByAdmin).length;
    return NextResponse.json(
      {
        bookings: bellList,
        allBookings,
        unreadCount,
      },
      { status: 200 }
    );
  }

  // Logged-in customer gets their own bookings
  if (user) {
    const myBookings = allBookings.filter(
      (b) =>
        (b.customerId && b.customerId === user.id) ||
        (b.customerPhone && b.customerPhone === user.phone)
    );
    return NextResponse.json(
      {
        bookings: myBookings,
        unreadCount: 0,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ bookings: [], unreadCount: 0 }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const {
      productId,
      productName,
      productImage,
      productPrice,
      productCode,
      uidNumber,
      modelNumber,
      categorySlug,
      categoryLabel,
      quantity,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerNote,
    } = body;

    let finalProdName =
      typeof productName === "string" ? productName.trim() : "";
    let finalProdImg =
      typeof productImage === "string" ? productImage.trim() : "";
    let finalProdPrice =
      typeof productPrice === "string" ? productPrice.trim() : "";
    let finalProdCode =
      typeof productCode === "string" ? productCode.trim() : "";
    let finalUid = typeof uidNumber === "string" ? uidNumber.trim() : "";
    let finalModel = typeof modelNumber === "string" ? modelNumber.trim() : "";
    let finalCatSlug =
      typeof categorySlug === "string" ? categorySlug.trim() : "";
    let finalCatLabel =
      typeof categoryLabel === "string" ? categoryLabel.trim() : "";

    if (productId) {
      const products = readProducts();
      const matched = products.find((p) => p.id === productId);
      if (matched) {
        if (!finalProdName) finalProdName = matched.name;
        if (!finalProdImg) finalProdImg = matched.images?.[0] || "";
        if (!finalProdPrice) finalProdPrice = matched.price || "";
        if (!finalProdCode) finalProdCode = matched.productCode || "";
        if (!finalUid) finalUid = matched.uidNumber || "";
        if (!finalModel) finalModel = matched.modelNumber || "";
        if (!finalCatSlug) finalCatSlug = matched.categorySlug || "";
        if (!finalCatLabel) finalCatLabel = matched.categoryLabel || "";
      }
    }

    const finalCustName =
      (typeof customerName === "string" && customerName.trim()) ||
      user?.name ||
      "";
    const finalCustPhone =
      (typeof customerPhone === "string" && customerPhone.trim()) ||
      user?.phone ||
      "";
    const finalCustEmail =
      (typeof customerEmail === "string" && customerEmail.trim()) ||
      user?.email ||
      "";
    const finalCustAddress =
      (typeof customerAddress === "string" && customerAddress.trim()) ||
      user?.address ||
      "";

    if (!finalCustName || !finalCustPhone) {
      return NextResponse.json(
        { error: "Customer Name and Phone Number are required." },
        { status: 400 }
      );
    }

    const qty = Math.max(1, parseInt(String(quantity || "1"), 10) || 1);
    const nowIso = new Date().toISOString();

    const newBooking: BookingNotificationRecord = {
      id: `bk-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      productId: productId || "",
      productName: finalProdName || finalCatLabel || "Booked Product",
      productImage: finalProdImg,
      productPrice: finalProdPrice,
      productCode: finalProdCode,
      uidNumber: finalUid,
      modelNumber: finalModel,
      categorySlug: finalCatSlug,
      categoryLabel: finalCatLabel,
      quantity: qty,
      customerId: user?.id || "",
      customerName: finalCustName,
      customerPhone: finalCustPhone,
      customerEmail: finalCustEmail,
      customerAddress: finalCustAddress,
      customerNote: typeof customerNote === "string" ? customerNote.trim() : "",
      status: "pending",
      seenByAdmin: false,
      dismissedFromBell: false,
      replies: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const allBookings = readBookings();
    allBookings.unshift(newBooking);
    writeBookings(allBookings);

    return NextResponse.json(
      {
        booking: newBooking,
        message: "Product booked successfully!",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid booking request." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id, status, replyMessage, recordAsSale } = body;
    const allBookings = readBookings();

    // 1. Mark all notifications as seen by Admin when clicking the Bell icon
    //    (removes the unread badge count from the bell icon while keeping items in the list)
    if (action === "mark_all_seen" && user.role === "admin") {
      const updated = allBookings.map((b) =>
        b.seenByAdmin ? b : { ...b, seenByAdmin: true }
      );
      writeBookings(updated);
      const bellList = updated.filter((b) => !b.dismissedFromBell);
      return NextResponse.json(
        {
          bookings: bellList,
          unreadCount: 0,
        },
        { status: 200 }
      );
    }

    // 2. Dismiss/remove a specific notification from the Bell list via the cross (✕) button
    if (action === "dismiss" && user.role === "admin" && id) {
      const updated = allBookings.map((b) =>
        b.id === id
          ? {
              ...b,
              dismissedFromBell: true,
              seenByAdmin: true,
              updatedAt: new Date().toISOString(),
            }
          : b
      );
      writeBookings(updated);
      const bellList = updated.filter((b) => !b.dismissedFromBell);
      const unreadCount = bellList.filter((b) => !b.seenByAdmin).length;
      return NextResponse.json(
        {
          bookings: bellList,
          unreadCount,
        },
        { status: 200 }
      );
    }

    // 3. Update booking status (Confirm / Cancel / Pending) by Admin
    if (action === "update_status" && user.role === "admin" && id) {
      const idx = allBookings.findIndex((b) => b.id === id);
      if (idx === -1) {
        return NextResponse.json(
          { error: "Booking not found." },
          { status: 404 }
        );
      }

      const prevStatus = allBookings[idx].status;
      const nextStatus: "pending" | "confirmed" | "cancelled" =
        status === "confirmed" || status === "cancelled" ? status : "pending";

      allBookings[idx] = {
        ...allBookings[idx],
        status: nextStatus,
        seenByAdmin: true,
        updatedAt: new Date().toISOString(),
      };
      writeBookings(allBookings);

      // Optional: if confirmed and recordAsSale is requested (and wasn't already confirmed)
      if (
        nextStatus === "confirmed" &&
        prevStatus !== "confirmed" &&
        recordAsSale !== false
      ) {
        const bk = allBookings[idx];
        const sales = readSales();
        const alreadyRecorded = sales.some(
          (s) => s.id === `sale-from-${bk.id}`
        );
        if (!alreadyRecorded) {
          const newSale: SoldProductRecord = {
            id: `sale-from-${bk.id}`,
            productId: bk.productId,
            productImage: bk.productImage,
            productName: bk.productName,
            productCode: bk.productCode || "",
            uidNumber: bk.uidNumber || bk.productCode || "",
            modelNumber: bk.modelNumber || "",
            categoryLabel: bk.categoryLabel || "",
            description: bk.customerNote || "",
            customFields: [],
            price: parseNumericPrice(bk.productPrice),
            priceDisplay: bk.productPrice,
            quantity: bk.quantity || 1,
            soldDate: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
          };
          sales.unshift(newSale);
          writeSales(sales);
        }
      }

      return NextResponse.json(
        { booking: allBookings[idx] },
        { status: 200 }
      );
    }

    // 4. Reply back / interact on a booking (Admin or Customer)
    if (action === "reply" && id && typeof replyMessage === "string") {
      const trimmed = replyMessage.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Reply message cannot be empty." },
          { status: 400 }
        );
      }
      const idx = allBookings.findIndex((b) => b.id === id);
      if (idx === -1) {
        return NextResponse.json(
          { error: "Booking not found." },
          { status: 404 }
        );
      }

      const newReply: BookingReply = {
        id: `rep-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
        sender: user.role === "admin" ? "admin" : "customer",
        senderName:
          user.role === "admin" ? `${user.name} (Admin)` : user.name,
        message: trimmed,
        createdAt: new Date().toISOString(),
      };

      const existingReplies = Array.isArray(allBookings[idx].replies)
        ? allBookings[idx].replies
        : [];

      allBookings[idx] = {
        ...allBookings[idx],
        replies: [...existingReplies, newReply],
        seenByAdmin: user.role === "admin" ? true : false,
        dismissedFromBell:
          user.role === "admin" ? allBookings[idx].dismissedFromBell : false,
        updatedAt: new Date().toISOString(),
      };

      writeBookings(allBookings);
      return NextResponse.json(
        { booking: allBookings[idx] },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

