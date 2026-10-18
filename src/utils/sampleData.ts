/**
 * Sample routine builders and generators.
 * Generates exact files conforming to the Samsung Routine specification,
 * including the known-good test specification:
 * - Routine name: Charging
 * - Body version: 1.0.0
 * - Condition tag: plugged_battery_v3
 * - Action tag: custom_notification_v3
 * - Notification title: charging
 * - Condition UUID: 7662462504390312209
 * - Action UUID: 1020831916551457731
 */

import JSZip from 'jszip';
import { HEADER_SIZE } from './routineDecoder';

export const DEFAULT_AES_KEY = '308204d4308203bca003020102020900';

export const KNOWN_GOOD_SPEC = {
  routineName: 'Charging',
  bodyVersion: '1.0.0',
  conditionTag: 'plugged_battery_v3',
  actionTag: 'custom_notification_v3',
  notificationTitle: 'charging',
  conditionUuid: '7662462504390312209',
  actionUuid: '1020831916551457731',
  sampleKeyV2: DEFAULT_AES_KEY,
};

/**
 * Builds a raw Samsung Routine binary (.rtn payload)
 */
export function buildRoutineBinary(
  headerObj: Record<string, unknown>,
  bodyBytes: Uint8Array,
  footerObj: Record<string, unknown>
): Uint8Array {
  const encoder = new TextEncoder();
  const headerJson = JSON.stringify(headerObj);
  const headerBytes = encoder.encode(headerJson);

  if (headerBytes.length > HEADER_SIZE) {
    throw new Error(`Header JSON exceeds ${HEADER_SIZE} bytes (${headerBytes.length} bytes).`);
  }

  // 512-byte null-padded header
  const headerBlock = new Uint8Array(HEADER_SIZE);
  headerBlock.set(headerBytes, 0); // rest remains 0x00

  const footerJson = JSON.stringify(footerObj);
  const footerBytes = encoder.encode(footerJson);

  const totalLength = HEADER_SIZE + bodyBytes.length + footerBytes.length;
  const result = new Uint8Array(totalLength);

  result.set(headerBlock, 0);
  result.set(bodyBytes, HEADER_SIZE);
  result.set(footerBytes, HEADER_SIZE + bodyBytes.length);

  return result;
}

/**
 * Creates the exact known-good Samsung Routine v1.0.0 (unencrypted) payload
 */
export function createKnownGoodRoutinePayload(): {
  payload: Uint8Array;
  bodyJsonText: string;
} {
  // Notice the unquoted 64-bit numbers in the JSON!
  const bodyJsonText = `{
  "name": "${KNOWN_GOOD_SPEC.routineName}",
  "version": "${KNOWN_GOOD_SPEC.bodyVersion}",
  "uuid": 8941029410492817492,
  "conditions": [
    {
      "tag": "${KNOWN_GOOD_SPEC.conditionTag}",
      "uuid": ${KNOWN_GOOD_SPEC.conditionUuid},
      "parameters": {
        "plugged_type": 2
      }
    }
  ],
  "actions": [
    {
      "tag": "${KNOWN_GOOD_SPEC.actionTag}",
      "uuid": ${KNOWN_GOOD_SPEC.actionUuid},
      "parameters": {
        "title": "${KNOWN_GOOD_SPEC.notificationTitle}",
        "content": "Device plugged into power source"
      }
    }
  ],
  "attributes": {
    "enabled": true,
    "icon": "sec:charging",
    "color": 4
  }
}`;

  const encoder = new TextEncoder();
  const bodyBytes = encoder.encode(bodyJsonText);

  const footerObj = {
    version: '1.0.0',
    type: 'checksum_record',
    timestamp: 1697629200,
  };
  const footerBytes = encoder.encode(JSON.stringify(footerObj));

  const headerObj = {
    version: '1.0.0',
    body_size: bodyBytes.length,
    footer_size: footerBytes.length,
    device_model: 'SM-S928B',
  };

  const payload = buildRoutineBinary(headerObj, bodyBytes, footerObj);
  return { payload, bodyJsonText };
}

/**
 * Creates a ZIP-wrapped version of the known-good routine (.rtn file)
 */
export async function createZipWrappedRoutine(fileName = 'Charging.rtn'): Promise<File> {
  const { payload } = createKnownGoodRoutinePayload();
  const zip = new JSZip();
  zip.file('routine_0', payload);
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], fileName, { type: 'application/octet-stream' });
}

/**
 * Creates an encrypted v2.0 routine using AES-GCM
 */
export async function createEncryptedRoutine(
  keyString = KNOWN_GOOD_SPEC.sampleKeyV2,
  fileName = 'Encrypted_Routine.rtn'
): Promise<{ file: File; key: string }> {
  const { bodyJsonText } = createKnownGoodRoutinePayload();
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(bodyJsonText);

  // Generate 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import key
  const keyBytes = encoder.encode(keyString);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    plaintext
  );

  const encryptedBytes = new Uint8Array(encryptedBuf);
  // body is iv (12 bytes) + ciphertext + tag (16 bytes)
  const bodyWithIv = new Uint8Array(12 + encryptedBytes.length);
  bodyWithIv.set(iv, 0);
  bodyWithIv.set(encryptedBytes, 12);

  const footerObj = {
    version: '2.0.0',
    type: 'encrypted_footer',
  };
  const footerBytes = encoder.encode(JSON.stringify(footerObj));

  const headerObj = {
    version: '2.0',
    body_size: bodyWithIv.length,
    footer_size: footerBytes.length,
    encrypted: true,
  };

  const payload = buildRoutineBinary(headerObj, bodyWithIv, footerObj);

  // Also wrap in ZIP container
  const zip = new JSZip();
  zip.file('routine_0', payload);
  const blob = await zip.generateAsync({ type: 'blob' });
  const file = new File([blob], fileName, { type: 'application/octet-stream' });

  return { file, key: keyString };
}
