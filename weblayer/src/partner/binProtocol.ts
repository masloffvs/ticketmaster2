const MAGIC = [0x54, 0x4d, 0x42, 0x31] as const;

export interface PartnerKeyFile {
  kind: "tm-partner-keypair-v1";
  algorithm: string;
  partnerId: string;
  email: string;
  issuedAt: string;
  publicKeyFingerprint: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export interface PartnerSummary {
  id: string;
  email: string;
  name: string | null;
  publicKeyFingerprint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
}

export interface PartnerSession {
  token: string;
  expiresAt: string;
  partner: PartnerSummary;
  keyFingerprint: string;
}

interface BinEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeBinFrame(payload: unknown): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const frame = new Uint8Array(8 + body.length);
  frame.set(MAGIC, 0);
  new DataView(frame.buffer).setUint32(4, body.length, true);
  frame.set(body, 8);
  return frame;
}

export function decodeBinFrame<T>(buffer: ArrayBuffer): BinEnvelope<T> {
  const frame = new Uint8Array(buffer);
  if (frame.byteLength < 8) {
    throw new Error("Invalid binary frame");
  }
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (frame[i] !== MAGIC[i]) {
      throw new Error("Unexpected binary frame magic");
    }
  }
  const size = new DataView(frame.buffer).getUint32(4, true);
  const body = frame.subarray(8);
  if (size !== body.byteLength) {
    throw new Error("Corrupted binary frame");
  }
  return JSON.parse(new TextDecoder().decode(body)) as BinEnvelope<T>;
}

export async function postBin<T>(payload: unknown): Promise<T> {
  const res = await fetch("/api/bin", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      Accept: "application/octet-stream",
    },
    body: encodeBinFrame(payload),
  });

  const envelope = decodeBinFrame<T>(await res.arrayBuffer());
  if (!res.ok || !envelope.ok || envelope.data === undefined) {
    throw new Error(envelope.error || `HTTP ${res.status}`);
  }
  return envelope.data;
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

export async function signString(
  privateKey: CryptoKey,
  value: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    bytes,
  );
  return toBase64(new Uint8Array(signature))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function parseKeyFile(raw: string): PartnerKeyFile {
  const parsed = JSON.parse(raw) as PartnerKeyFile;
  if (parsed.kind !== "tm-partner-keypair-v1") {
    throw new Error("Unsupported partner key file");
  }
  if (!parsed.email || !parsed.privateKeyJwk || !parsed.publicKeyJwk) {
    throw new Error("Incomplete partner key file");
  }
  return parsed;
}

export function fingerprintPreview(fingerprint: string): string {
  if (!fingerprint) return "—";
  return `${fingerprint.slice(0, 12)}…${fingerprint.slice(-6)}`;
}

export async function verifyStoredSession(
  session: PartnerSession,
): Promise<PartnerSession | null> {
  try {
    const data = await postBin<{
      partner: PartnerSummary;
      session: { expiresAt: string };
    }>({
      action: "session.me",
      sessionToken: session.token,
    });
    return {
      ...session,
      expiresAt: data.session.expiresAt,
      partner: data.partner,
    };
  } catch {
    return null;
  }
}
