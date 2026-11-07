import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface UserRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  passwordHash: string;
  passwordPlain?: string;
  role: "customer" | "admin";
  createdAt: string;
  sessionVersion?: number;
}

export interface PublicUser {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  role: "customer" | "admin";
}

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  "furious-commercial-hmac-secret-key-2026-change-in-prod";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf-8");
  }

  // Ensure the seeded Admin account (Mridul) exists with phone 01836585258
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const users: UserRecord[] = JSON.parse(raw);
    if (Array.isArray(users)) {
      const mridulIndex = users.findIndex(
        (u) => u.id === "admin-mridul-1" || u.role === "admin"
      );
      if (mridulIndex === -1) {
        users.push({
          id: "admin-mridul-1",
          name: "Mridul",
          phone: "01836585258",
          address: "Race Course",
          email: "mridul@gmail.com",
          passwordHash: hashPassword("123456"),
          passwordPlain: "123456",
          role: "admin",
          createdAt: new Date().toISOString(),
        });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      } else {
        let updated = false;
        if (!users[mridulIndex].phone) {
          users[mridulIndex].phone = "01836585258";
          updated = true;
        }
        if (!users[mridulIndex].passwordPlain) {
          users[mridulIndex].passwordPlain = "123456";
          updated = true;
        }
        if (updated) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        }
      }
    }
  } catch {
    // Ignore seed read errors
  }
}

export function readUsers(): UserRecord[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeUsers(users: UserRecord[]): void {
  ensureDataFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function createSessionToken(
  user: PublicUser,
  sessionVersion: number = 1
): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...user,
      version: sessionVersion,
      exp: Date.now() + 1000 * 60 * 60 * 2, // 2-hour inactivity session lifetime
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): PublicUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!data.exp || Date.now() > data.exp) return null;

    // Server-side session invalidation: ensure token version matches current active session in database
    const users = readUsers();
    const dbUser = users.find((u) => u.id === data.id);
    if (!dbUser) return null;

    const currentVersion = dbUser.sessionVersion || 1;
    if ((data.version || 1) !== currentVersion) {
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      phone: dbUser.phone,
      address: dbUser.address,
      email: dbUser.email,
      role: dbUser.role,
    };
  } catch {
    return null;
  }
}

export function invalidateUserSessions(userId: string): void {
  try {
    const users = readUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.sessionVersion = (user.sessionVersion || 1) + 1;
      writeUsers(users);
    }
  } catch {
    // Ignore error
  }
}
