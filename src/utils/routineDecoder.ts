/**
 * Samsung Routine (.rtn) Binary Parser & Cryptographic Decryptor
 * Supports .rtn files, ZIP-wrapped payloads, AES-GCM Web Crypto decryption,
 * strict file offset boundary validation, and 64-bit integer preservation.
 */

import JSZip from 'jszip';
import {
  parseLosslessJson,
  stringifyLossless,
  hasPotentiallyUnsafeBigInt,
  JsonValue,
  LosslessNumber,
} from './losslessJson';

export const HEADER_SIZE = 512;

export interface RoutineCondition {
  tag?: string;
  uuid?: string | number | LosslessNumber;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RoutineAction {
  tag?: string;
  uuid?: string | number | LosslessNumber;
  parameters?: {
    title?: string;
    content?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DecodedRoutineSummary {
  name?: string;
  bodyVersion?: string;
  uuid?: string | number | LosslessNumber;
  conditions: RoutineCondition[];
  actions: RoutineAction[];
  attributes?: Record<string, unknown>;
  has64BitIntegers: boolean;
  largeIntegerValues: string[];
}

export interface RoutineDecodedOutput {
  fileName: string;
  fileSizeBytes: number;
  payloadSizeBytes: number;
  isZipWrapped: boolean;
  zipEntryName?: string;
  header: {
    version: string;
    body_size: number;
    footer_size: number;
    rawJson: JsonValue;
    formattedText: string;
    nullPaddingBytes: number;
    rawBytes: Uint8Array;
  };
  offsets: {
    headerStart: number;
    headerEnd: number;
    bodyStart: number;
    bodyEnd: number;
    footerStart: number;
    footerEnd: number;
    totalPayloadBytes: number;
  };
  footer: {
    rawJson: JsonValue;
    formattedText: string;
    rawBytes: Uint8Array;
  };
  body: {
    isEncryptedVersion: boolean;
    wasDecrypted: boolean;
    isRawMode: boolean;
    rawEncryptedBytes: Uint8Array;
    processedBytes: Uint8Array;
    text: string;
    formattedJsonText?: string;
    parsedJson?: JsonValue;
    isUtf8: boolean;
    isJson: boolean;
    has64BitIntegers: boolean;
    aesGcmDetails?: {
      ivHex: string;
      tagLengthBits: number;
      keyCandidateType: 'utf8' | 'hex';
      keyLengthBits: number;
    };
  };
  summary?: DecodedRoutineSummary;
  notes: string[];
}

/**
 * Compares two semantic version strings like "2.0" and "1.0.0".
 * Returns true if a > b.
 */
export function versionGreater(a: string, b: string): boolean {
  const parts = (v: string) =>
    String(v)
      .split('.')
      .map(p => {
        const n = Number.parseInt(p, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const pa = parts(a);
  const pb = parts(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

export function decodeUtf8(bytes: Uint8Array, fatal = false): string {
  return new TextDecoder('utf-8', { fatal }).decode(bytes);
}

/**
 * Extracts raw routine payload from a file.
 * Handles ZIP-wrapped containers (checking PK\x03\x04 magic number) using JSZip.
 */
export async function extractPayload(
  fileOrBuffer: File | Uint8Array,
  fileName = 'routine.rtn'
): Promise<{ payload: Uint8Array; isZip: boolean; entryName?: string }> {
  let buf: Uint8Array;
  if (fileOrBuffer instanceof Uint8Array) {
    buf = fileOrBuffer;
  } else {
    buf = new Uint8Array(await fileOrBuffer.arrayBuffer());
  }

  // Check ZIP magic bytes (PK\x03\x04)
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    try {
      const zip = await JSZip.loadAsync(buf);
      const files = Object.values(zip.files).filter(f => !f.dir);
      if (!files.length) {
        throw new Error('ZIP archive contains no file entries.');
      }
      // Match python decoder behavior: look for routine_0 or fallback to first file
      const entry = files.find(f => f.name.split('/').pop() === 'routine_0') || files[0];
      const unzipped = await entry.async('uint8array');
      return { payload: unzipped, isZip: true, entryName: entry.name };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract ZIP-wrapped routine container: ${msg}`);
    }
  }

  return { payload: buf, isZip: false };
}

/**
 * AES-GCM Decryption via Web Crypto API.
 * Supports UTF-8 strings or hex strings (16, 24, or 32 bytes).
 */
export async function decryptAesGcm(
  bodyBytes: Uint8Array,
  keyString: string
): Promise<{
  plaintext: Uint8Array;
  ivHex: string;
  tagLengthBits: number;
  keyCandidateType: 'utf8' | 'hex';
  keyLengthBits: number;
}> {
  if (!keyString || !keyString.trim()) {
    throw new Error('An AES key is required to decrypt this version.');
  }

  const cleanKey = keyString.trim();
  const candidates: Array<{ bytes: Uint8Array; type: 'utf8' | 'hex' }> = [];

  // UTF-8 candidate
  const utf8Bytes = new TextEncoder().encode(cleanKey);
  candidates.push({ bytes: utf8Bytes, type: 'utf8' });

  // Hex candidate
  if (/^([0-9a-fA-F]{2})+$/.test(cleanKey)) {
    const hexBytes = Uint8Array.from(cleanKey.match(/../g)!, h => parseInt(h, 16));
    candidates.push({ bytes: hexBytes, type: 'hex' });
  }

  const valid = candidates.filter(k => [16, 24, 32].includes(k.bytes.length));
  if (!valid.length) {
    throw new Error(
      `Invalid AES key length (${utf8Bytes.length} bytes UTF-8). Expected 16 bytes (AES-128), 24 bytes (AES-192), or 32 bytes (AES-256), or 32/48/64 hex characters.`
    );
  }

  if (bodyBytes.length < 12 + 16) {
    throw new Error(
      `Encrypted body is too short (${bodyBytes.length} bytes). AES-GCM requires at least a 12-byte IV and 16-byte authentication tag.`
    );
  }

  const iv = bodyBytes.slice(0, 12);
  const ciphertextAndTag = bodyBytes.slice(12);
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

  let lastError: Error | null = null;
  for (const candidate of valid) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        candidate.bytes as BufferSource,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
        cryptoKey,
        ciphertextAndTag as BufferSource
      );

      return {
        plaintext: new Uint8Array(decryptedBuffer),
        ivHex,
        tagLengthBits: 128,
        keyCandidateType: candidate.type,
        keyLengthBits: candidate.bytes.length * 8,
      };
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error(
    `AES-GCM decryption failed: authentication tag verification failed. The provided key is incorrect or the routine payload is corrupted (${lastError?.name || 'Authentication Failed'}).`
  );
}

export interface DecodeOptions {
  key?: string;
  noDecrypt?: boolean;
}

/**
 * Decodes a Samsung Routine file (.rtn or raw payload) with complete integrity checks.
 */
export async function decodeRoutineFile(
  fileOrBuffer: File | Uint8Array,
  fileName = 'routine.rtn',
  options: DecodeOptions = {}
): Promise<RoutineDecodedOutput> {
  const notes: string[] = [];
  const fileSizeBytes = fileOrBuffer instanceof File ? fileOrBuffer.size : fileOrBuffer.byteLength;

  // 1. Extract payload (handling ZIP wrapper if present)
  const { payload, isZip, entryName } = await extractPayload(fileOrBuffer, fileName);
  const payloadSizeBytes = payload.length;

  if (isZip) {
    notes.push(`Extracted payload from ZIP archive entry: "${entryName}".`);
  }

  // 2. Validate Header Size
  if (payload.length < HEADER_SIZE) {
    throw new Error(
      `Invalid routine file: payload is too small (${payload.length} bytes; expected minimum header of ${HEADER_SIZE} bytes).`
    );
  }

  // 3. Extract and parse Header
  const rawHeaderBytes = payload.slice(0, HEADER_SIZE);
  let headerContentBytes = rawHeaderBytes;
  const nulIdx = rawHeaderBytes.indexOf(0);
  let nullPaddingBytes = 0;
  if (nulIdx >= 0) {
    headerContentBytes = rawHeaderBytes.slice(0, nulIdx);
    nullPaddingBytes = HEADER_SIZE - nulIdx;
  }

  let headerJson: JsonValue;
  try {
    const headerStr = decodeUtf8(headerContentBytes, true).trim();
    headerJson = parseLosslessJson(headerStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Header (512 bytes) is not valid JSON: ${msg}`);
  }

  if (typeof headerJson !== 'object' || headerJson === null || Array.isArray(headerJson)) {
    throw new Error('Header JSON must be a key-value object.');
  }

  const rawHeaderObj = headerJson as Record<string, unknown>;
  const version = String(rawHeaderObj['version'] ?? '0.0');
  const bodySize = Number(rawHeaderObj['body_size'] ?? 0);
  const footerSize = Number(rawHeaderObj['footer_size'] ?? 0);

  if (!Number.isSafeInteger(bodySize) || bodySize < 0) {
    throw new Error(`Header contains invalid body_size: "${rawHeaderObj['body_size']}". Must be a non-negative integer.`);
  }

  if (!Number.isSafeInteger(footerSize) || footerSize < 0) {
    throw new Error(`Header contains invalid footer_size: "${rawHeaderObj['footer_size']}". Must be a non-negative integer.`);
  }

  // 4. Validate Offsets
  const bodyStart = HEADER_SIZE;
  const bodyEnd = bodyStart + bodySize;
  const footerStart = bodyEnd;
  const footerEnd = footerStart + footerSize;

  if (footerEnd > payload.length) {
    throw new Error(
      `File boundary violation: header specified body_size=${bodySize} and footer_size=${footerSize} (requiring offset ${footerEnd} bytes), but payload has only ${payload.length} bytes.`
    );
  }

  const rawBodyBytes = payload.slice(bodyStart, bodyEnd);
  const rawFooterBytes = payload.slice(footerStart, footerEnd);

  // 5. Parse Footer
  let footerJson: JsonValue;
  try {
    const footerStr = decodeUtf8(rawFooterBytes, true).trim();
    footerJson = parseLosslessJson(footerStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Footer (${footerSize} bytes) is not valid JSON: ${msg}`);
  }

  // 6. Handle Body Decryption & Text Decoding
  const isEncryptedVersion = !versionGreater('2.0', version); // version >= 2.0
  const userKey = (options.key || '').trim();
  const shouldSkipDecrypt = (options.noDecrypt ?? false) && !userKey;

  let processedBodyBytes: Uint8Array = new Uint8Array(rawBodyBytes);
  let wasDecrypted = false;
  let isRawMode = false;
  let aesGcmDetails: RoutineDecodedOutput['body']['aesGcmDetails'];

  if (isEncryptedVersion) {
    if (!shouldSkipDecrypt) {
      if (!userKey) {
        throw new Error(
          `Routine format version ${version} requires AES-GCM decryption. Please enter an AES key or check 'Inspect Raw / Do not decrypt'.`
        );
      }
      const decResult = await decryptAesGcm(rawBodyBytes, userKey);
      processedBodyBytes = decResult.plaintext;
      wasDecrypted = true;
      aesGcmDetails = {
        ivHex: decResult.ivHex,
        tagLengthBits: decResult.tagLengthBits,
        keyCandidateType: decResult.keyCandidateType,
        keyLengthBits: decResult.keyLengthBits,
      };
      notes.push(`Decrypted AES-GCM body (${decResult.keyLengthBits}-bit key, IV: ${decResult.ivHex}). Authentication succeeded.`);
    } else {
      isRawMode = true;
      notes.push('Version >= 2.0: Stored body inspected in raw mode without decryption. Bytes may appear non-textual.');
    }
  }

  // 7. UTF-8 & JSON Analysis
  let bodyText = '';
  let isUtf8 = false;
  try {
    bodyText = decodeUtf8(processedBodyBytes, true);
    isUtf8 = true;
  } catch {
    bodyText = decodeUtf8(processedBodyBytes, false);
    isUtf8 = false;
  }

  let parsedJson: JsonValue | undefined;
  let formattedJsonText: string | undefined;
  let isJson = false;
  let has64BitInts = false;

  if (isUtf8 && bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[')) {
    try {
      parsedJson = parseLosslessJson(bodyText);
      isJson = true;
      formattedJsonText = stringifyLossless(parsedJson, 2);
      has64BitInts = hasPotentiallyUnsafeBigInt(bodyText);
      if (has64BitInts) {
        notes.push('Preserved exact 64-bit integer values in JSON body (safe from standard JavaScript IEEE 754 precision loss).');
      }
    } catch {
      // Not valid JSON, leave as text
    }
  }

  // 8. Extract Summary info if routine JSON is recognized
  let summary: DecodedRoutineSummary | undefined;
  if (isJson && parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
    const bObj = parsedJson as Record<string, unknown>;
    const largeInts: string[] = [];

    const findLargeInts = (node: unknown) => {
      if (node instanceof LosslessNumber) {
        largeInts.push(node.raw);
      } else if (Array.isArray(node)) {
        node.forEach(findLargeInts);
      } else if (typeof node === 'object' && node !== null) {
        Object.values(node).forEach(findLargeInts);
      }
    };
    findLargeInts(parsedJson);

    // Look for conditions and actions (supports direct root or nested inside rule / routine)
    const rawConditions = (bObj['conditions'] ||
      (bObj['rule'] as Record<string, unknown>)?.['conditions'] ||
      []) as RoutineCondition[];
    const rawActions = (bObj['actions'] ||
      (bObj['rule'] as Record<string, unknown>)?.['actions'] ||
      []) as RoutineAction[];

    summary = {
      name: typeof bObj['name'] === 'string' ? bObj['name'] : undefined,
      bodyVersion: typeof bObj['version'] === 'string' ? bObj['version'] : undefined,
      uuid: (bObj['uuid'] as string | number | LosslessNumber) ?? undefined,
      conditions: Array.isArray(rawConditions) ? rawConditions : [],
      actions: Array.isArray(rawActions) ? rawActions : [],
      attributes: typeof bObj['attributes'] === 'object' && bObj['attributes'] !== null
        ? (bObj['attributes'] as Record<string, unknown>)
        : undefined,
      has64BitIntegers: largeInts.length > 0 || has64BitInts,
      largeIntegerValues: largeInts,
    };
  }

  return {
    fileName,
    fileSizeBytes,
    payloadSizeBytes,
    isZipWrapped: isZip,
    zipEntryName: entryName,
    header: {
      version,
      body_size: bodySize,
      footer_size: footerSize,
      rawJson: headerJson,
      formattedText: stringifyLossless(headerJson, 2),
      nullPaddingBytes,
      rawBytes: rawHeaderBytes,
    },
    offsets: {
      headerStart: 0,
      headerEnd: HEADER_SIZE,
      bodyStart,
      bodyEnd,
      footerStart,
      footerEnd,
      totalPayloadBytes: payload.length,
    },
    footer: {
      rawJson: footerJson,
      formattedText: stringifyLossless(footerJson, 2),
      rawBytes: rawFooterBytes,
    },
    body: {
      isEncryptedVersion,
      wasDecrypted,
      isRawMode,
      rawEncryptedBytes: rawBodyBytes,
      processedBytes: processedBodyBytes,
      text: bodyText,
      formattedJsonText,
      parsedJson,
      isUtf8,
      isJson,
      has64BitIntegers: has64BitInts,
      aesGcmDetails,
    },
    summary,
    notes,
  };
}
