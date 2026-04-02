import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "ccw_session";
const SESSION_MAX_AGE = 60 * 60 * 12;

export type SessionUser = {
  id: string;
  username: string;
  nombre: string | null;
  apellido: string | null;
  role: "admin" | "user";
};

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("Falta APP_SESSION_SECRET");
  return secret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function encode(payload: object) {
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString("base64url");
  const signature = sign(base64);
  return `${base64}.${signature}`;
}

function decode(token: string): SessionUser | null {
  const [base64, signature] = token.split(".");
  if (!base64 || !signature) return null;
  if (sign(base64) !== signature) return null;

  try {
    const json = Buffer.from(base64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as SessionUser & { exp: number };
    if (!payload.exp || Date.now() > payload.exp) return null;

    return {
      id: payload.id,
      username: payload.username,
      nombre: payload.nombre,
      apellido: payload.apellido,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const payload = {
    ...user,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  const token = encode(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}