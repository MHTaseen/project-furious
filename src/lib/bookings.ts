import fs from "fs";
import path from "path";

export interface BookingReply {
  id: string;
  sender: "admin" | "customer";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface BookingNotificationRecord {
  id: string;
  // Product snapshot
  productId: string;
  productName: string;
  productImage: string;
  productPrice: string;
  productCode: string;
  uidNumber: string;
  modelNumber: string;
  categorySlug: string;
  categoryLabel: string;
  quantity: number;
  // Customer snapshot
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerNote: string;
  // Booking status & interaction
  status: "pending" | "confirmed" | "cancelled";
  seenByAdmin: boolean;
  dismissedFromBell: boolean;
  replies: BookingReply[];
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

function ensureBookingsFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function readBookings(): BookingNotificationRecord[] {
  ensureBookingsFile();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeBookings(bookings: BookingNotificationRecord[]): void {
  ensureBookingsFile();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf-8");
}

