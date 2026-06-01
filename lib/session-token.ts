import type { SessionUser } from "@/lib/session-types";

export const SESSION_COOKIE = "servora_session";
const SESSION_DAYS = 14;

type SessionPayload = SessionUser & { exp: number };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required in production");
    }
    return "dev-session-secret-change-me";
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function textToBase64Url(text: string): string {
  return toBase64Url(new TextEncoder().encode(text));
}

function base64UrlToText(str: string): string {
  return new TextDecoder().decode(fromBase64Url(str));
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const body = textToBase64Url(JSON.stringify(payload));
  const sig = await signPayload(body);
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await signPayload(body);
  if (!timingSafeEqualStr(sig, expected)) {
    return null;
  }
  try {
    const data = JSON.parse(base64UrlToText(body)) as SessionPayload;
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.userId || !data.email || !data.role) return null;
    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}
