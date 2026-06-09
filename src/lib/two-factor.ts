import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Base32 encoding (RFC 4648)
// ---------------------------------------------------------------------------

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode a Buffer to a base32 string (RFC 4648, no padding).
 */
export function generateBase32Secret(length: number = 20): string {
  const bytes = crypto.randomBytes(length);
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    const index = parseInt(chunk, 2);
    secret += BASE32_CHARS[index];
  }
  return secret;
}

/**
 * Decode a base32 string to a Buffer.
 */
function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (const char of cleaned) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// TOTP (RFC 6238) – simple implementation using Node.js crypto
// ---------------------------------------------------------------------------

/**
 * Generate a TOTP code for the given secret and time.
 * @param secret - Base32-encoded TOTP secret
 * @param time   - Unix timestamp (seconds). Defaults to Date.now() / 1000.
 * @param step   - Time step in seconds (default 30)
 * @param digits - Number of digits in the OTP (default 6)
 */
export function generateTOTP(
  secret: string,
  time?: number,
  step: number = 30,
  digits: number = 6,
): string {
  const t = Math.floor((time ?? Date.now() / 1000) / step);

  // Encode counter as 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(t / 0x100000000), 0);
  counterBuf.writeUInt32BE(t & 0xffffffff, 4);

  // Decode secret from base32
  const key = base32Decode(secret);

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const hmacResult = hmac.digest();

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP code against a secret, allowing for clock drift.
 * Checks the current time step plus/minus `window` steps.
 * @param secret - Base32-encoded TOTP secret
 * @param code   - The code to verify
 * @param window - Number of time steps to check on each side (default 1)
 * @param step   - Time step in seconds (default 30)
 * @param digits - Number of digits (default 6)
 */
export function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1,
  step: number = 30,
  digits: number = 6,
): boolean {
  const now = Math.floor(Date.now() / 1000);

  for (let i = -window; i <= window; i++) {
    const t = now + i * step;
    const expected = generateTOTP(secret, t, step, digits);
    // Constant-time comparison to prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a base32 TOTP secret (alias for generateBase32Secret).
 */
export function generateSecret(length: number = 20): string {
  return generateBase32Secret(length);
}

/**
 * Build an otpauth:// URI for QR code generation.
 * @param secret   - Base32 secret
 * @param email    - Account identifier
 * @param issuer   - Application name
 */
export function buildOtpauthUri(
  secret: string,
  email: string,
  issuer: string = 'StreamX',
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// ---------------------------------------------------------------------------
// Recovery codes
// ---------------------------------------------------------------------------

/**
 * Generate a set of recovery codes.
 * Each code is 8 characters: uppercase letters + digits, with a dash in the middle.
 * Example: "A3B7-C9D2"
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}
