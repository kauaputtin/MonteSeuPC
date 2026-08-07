import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error("INTEGRATION_ENCRYPTION_KEY não configurada.");
  const decoded = Buffer.from(value, "base64");
  if (decoded.byteLength !== 32) throw new Error("INTEGRATION_ENCRYPTION_KEY deve conter 32 bytes em Base64.");
  return decoded;
}

export function encryptIntegrationPayload(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptIntegrationPayload<T>(value: string): T {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Credencial criptografada inválida.");
  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as T;
}
