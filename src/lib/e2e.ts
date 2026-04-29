/**
 * End-to-End Encryption for Direct Messages
 *
 * Protocol:
 * 1. On first use, each user generates an ECDH key pair (P-256 curve)
 * 2. The PUBLIC key is stored in the `profiles` table (public_key column)
 * 3. The PRIVATE key is stored ONLY in the user's localStorage — never sent to server
 * 4. To send a message to Bob:
 *    a. Fetch Bob's public key from DB
 *    b. Derive a shared secret via ECDH (my private key + Bob's public key)
 *    c. Derive an AES-GCM key from the shared secret via HKDF
 *    d. Encrypt the message with AES-GCM (random IV per message)
 *    e. Store: base64(iv) + ":" + base64(ciphertext)
 * 5. To decrypt: reverse the process using your own private key + sender's public key
 *
 * Security properties:
 * - Server only ever sees ciphertext
 * - Even the admin cannot read DMs
 * - Forward secrecy: not implemented (would require per-message key rotation)
 * - Key loss = message loss (no recovery without private key)
 */

const PRIVATE_KEY_STORAGE_PREFIX = "nxt_e2e_privkey_";
const PUBLIC_KEY_STORAGE_PREFIX  = "nxt_e2e_pubkey_";

// ── Key generation ────────────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<{ publicKeyB64: string; privateKeyB64: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable
    ["deriveKey", "deriveBits"],
  );

  const [pubRaw, privRaw] = await Promise.all([
    crypto.subtle.exportKey("spki", keyPair.publicKey),
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ]);

  return {
    publicKeyB64: arrayBufferToBase64(pubRaw),
    privateKeyB64: arrayBufferToBase64(privRaw),
  };
}

// ── Key storage (localStorage) ────────────────────────────────────────────────

export function storePrivateKey(userId: string, privateKeyB64: string): void {
  localStorage.setItem(PRIVATE_KEY_STORAGE_PREFIX + userId, privateKeyB64);
}

export function loadPrivateKey(userId: string): string | null {
  return localStorage.getItem(PRIVATE_KEY_STORAGE_PREFIX + userId);
}

export function storePublicKeyCache(userId: string, publicKeyB64: string): void {
  // Cache peer public keys in sessionStorage (cleared on tab close)
  sessionStorage.setItem(PUBLIC_KEY_STORAGE_PREFIX + userId, publicKeyB64);
}

export function loadPublicKeyCache(userId: string): string | null {
  return sessionStorage.getItem(PUBLIC_KEY_STORAGE_PREFIX + userId);
}

// ── Key import helpers ────────────────────────────────────────────────────────

async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey(
    "spki",
    raw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function importPrivateKey(b64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"],
  );
}

// ── Shared secret derivation ──────────────────────────────────────────────────

async function deriveSharedAESKey(myPrivateKeyB64: string, theirPublicKeyB64: string): Promise<CryptoKey> {
  const [myPrivKey, theirPubKey] = await Promise.all([
    importPrivateKey(myPrivateKeyB64),
    importPublicKey(theirPublicKeyB64),
  ]);

  // Derive raw bits via ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPubKey },
    myPrivKey,
    256,
  );

  // Stretch with HKDF into a proper AES-GCM key
  const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32), // fixed salt — OK for this use case
      info: new TextEncoder().encode("nxt-dm-v1"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message.
 * Returns a string in the format: base64(iv):base64(ciphertext)
 */
export async function encryptMessage(
  plaintext: string,
  myPrivateKeyB64: string,
  theirPublicKeyB64: string,
): Promise<string> {
  const aesKey = await deriveSharedAESKey(myPrivateKeyB64, theirPublicKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded,
  );

  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(ciphertext)}`;
}

/**
 * Decrypt a message encrypted with encryptMessage.
 * Returns the plaintext, or null if decryption fails.
 */
export async function decryptMessage(
  encrypted: string,
  myPrivateKeyB64: string,
  theirPublicKeyB64: string,
): Promise<string | null> {
  try {
    const [ivB64, ciphertextB64] = encrypted.split(":");
    if (!ivB64 || !ciphertextB64) return null;

    const aesKey = await deriveSharedAESKey(myPrivateKeyB64, theirPublicKeyB64);
    const iv = base64ToArrayBuffer(ivB64);
    const ciphertext = base64ToArrayBuffer(ciphertextB64);

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext,
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    // Decryption failed — key mismatch or corrupted data
    return null;
  }
}

/**
 * Check if a message content looks like an encrypted payload.
 */
export function isEncrypted(content: string): boolean {
  // Encrypted messages are: base64:base64 (two base64 strings separated by colon)
  const parts = content.split(":");
  if (parts.length !== 2) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(parts[0]) && /^[A-Za-z0-9+/]+=*$/.test(parts[1]);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
