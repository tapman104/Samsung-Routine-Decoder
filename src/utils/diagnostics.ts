/**
 * Diagnostics & Automated Test Suite
 * Validates:
 * 1. 64-bit integer preservation (UUIDs 7662462504390312209 & 1020831916551457731)
 * 2. Demonstration of standard JSON.parse() rounding corruption vs Lossless preservation
 * 3. AES-GCM 256-bit encryption/decryption roundtrip and tag verification
 * 4. Incorrect key rejection (failed authentication error)
 * 5. ZIP-wrapped container extraction
 * 6. File offset boundary validation & malformed file rejection
 */

import {
  parseLosslessJson,
  stringifyLossless,
  isLosslessNumber,
  JsonValue,
} from './losslessJson';
import {
  decodeRoutineFile,
  decryptAesGcm,
} from './routineDecoder';
import {
  KNOWN_GOOD_SPEC,
  createKnownGoodRoutinePayload,
  createZipWrappedRoutine,
  createEncryptedRoutine,
} from './sampleData';

export interface TestResult {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'running';
  details?: string;
  actual?: unknown;
  expected?: unknown;
  durationMs: number;
}

export async function runAllDiagnostics(
  onProgress?: (result: TestResult) => void
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  async function record(
    id: string,
    name: string,
    description: string,
    fn: () => Promise<{ actual: unknown; expected: unknown; details?: string }>
  ) {
    const t0 = performance.now();
    try {
      const res = await fn();
      const tr: TestResult = {
        id,
        name,
        description,
        status: 'passed',
        details: res.details,
        actual: res.actual,
        expected: res.expected,
        durationMs: Math.round(performance.now() - t0),
      };
      results.push(tr);
      onProgress?.(tr);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const tr: TestResult = {
        id,
        name,
        description,
        status: 'failed',
        details: msg,
        durationMs: Math.round(performance.now() - t0),
      };
      results.push(tr);
      onProgress?.(tr);
    }
  }

  // Test 1: 64-bit Integer & UUID Preservation
  await record(
    'test-64bit-preservation',
    '64-bit UUID Exact Digit Preservation',
    'Ensures UUIDs 7662462504390312209 and 1020831916551457731 are never rounded to ...2000 or ...0000',
    async () => {
      const testJson = `{"cond_uuid": 7662462504390312209, "act_uuid": 1020831916551457731}`;
      const parsed = parseLosslessJson(testJson);
      const parsedObj = parsed as { [key: string]: JsonValue };

      const condVal = parsedObj['cond_uuid'];
      const actVal = parsedObj['act_uuid'];

      const condStr = String(condVal);
      const actStr = String(actVal);

      if (condStr !== KNOWN_GOOD_SPEC.conditionUuid) {
        throw new Error(
          `Condition UUID was corrupted! Expected "${KNOWN_GOOD_SPEC.conditionUuid}", got "${condStr}"`
        );
      }
      if (actStr !== KNOWN_GOOD_SPEC.actionUuid) {
        throw new Error(
          `Action UUID was corrupted! Expected "${KNOWN_GOOD_SPEC.actionUuid}", got "${actStr}"`
        );
      }

      const stringified = stringifyLossless(parsed);
      if (!stringified.includes('7662462504390312209')) {
        throw new Error(`Stringified output does not preserve condition UUID digits: ${stringified}`);
      }
      if (!stringified.includes('1020831916551457731')) {
        throw new Error(`Stringified output does not preserve action UUID digits: ${stringified}`);
      }

      return {
        actual: { cond_uuid: condStr, act_uuid: actStr },
        expected: { cond_uuid: KNOWN_GOOD_SPEC.conditionUuid, act_uuid: KNOWN_GOOD_SPEC.actionUuid },
        details: `Both 64-bit UUIDs preserved with 100% exact digits. Lossless class: ${isLosslessNumber(condVal)}`,
      };
    }
  );

  // Test 2: Standard JSON.parse failure comparison
  await record(
    'test-standard-json-failure',
    'Standard JSON.parse() Precision Loss Demonstration',
    'Demonstrates that browser standard JSON.parse rounds 7662462504390312209 to 7662462504390312000',
    async () => {
      const testJson = `{"uuid": 7662462504390312209}`;
      const standardParsed = JSON.parse(testJson);
      const standardUuidStr = String(standardParsed.uuid);
      const isCorrupted = standardUuidStr.endsWith('000') || standardUuidStr !== KNOWN_GOOD_SPEC.conditionUuid;

      return {
        actual: `standard JSON.parse -> ${standardUuidStr} (corrupted by ${standardParsed.uuid - 7662462504390312209n})`,
        expected: `standard JS IEEE 754 float rounding to 7662462504390312000`,
        details: isCorrupted
          ? `Confirmed: standard JSON.parse() loses 64-bit precision (${standardUuidStr}). Our custom lossless parser is strictly required.`
          : 'Warning: unexpected standard parse result.',
      };
    }
  );

  // Test 3: Known-Good Routine Full Decode
  await record(
    'test-known-good-decode',
    'Known-Good Routine Payload Decoding',
    'Decodes the exact routine specification: Charging, 1.0.0, plugged_battery_v3, custom_notification_v3',
    async () => {
      const { payload } = createKnownGoodRoutinePayload();
      const decoded = await decodeRoutineFile(payload, 'Charging.rtn');

      const sum = decoded.summary;
      if (!sum) throw new Error('Summary was not extracted from decoded JSON');

      if (sum.name !== KNOWN_GOOD_SPEC.routineName) {
        throw new Error(`Expected routine name "${KNOWN_GOOD_SPEC.routineName}", got "${sum.name}"`);
      }
      if (sum.bodyVersion !== KNOWN_GOOD_SPEC.bodyVersion) {
        throw new Error(`Expected body version "${KNOWN_GOOD_SPEC.bodyVersion}", got "${sum.bodyVersion}"`);
      }
      if (sum.conditions[0]?.tag !== KNOWN_GOOD_SPEC.conditionTag) {
        throw new Error(`Expected condition tag "${KNOWN_GOOD_SPEC.conditionTag}", got "${sum.conditions[0]?.tag}"`);
      }
      if (String(sum.conditions[0]?.uuid) !== KNOWN_GOOD_SPEC.conditionUuid) {
        throw new Error(`Expected condition UUID "${KNOWN_GOOD_SPEC.conditionUuid}", got "${sum.conditions[0]?.uuid}"`);
      }
      if (sum.actions[0]?.tag !== KNOWN_GOOD_SPEC.actionTag) {
        throw new Error(`Expected action tag "${KNOWN_GOOD_SPEC.actionTag}", got "${sum.actions[0]?.tag}"`);
      }
      if (sum.actions[0]?.parameters?.title !== KNOWN_GOOD_SPEC.notificationTitle) {
        throw new Error(`Expected action notification title "${KNOWN_GOOD_SPEC.notificationTitle}", got "${sum.actions[0]?.parameters?.title}"`);
      }
      if (String(sum.actions[0]?.uuid) !== KNOWN_GOOD_SPEC.actionUuid) {
        throw new Error(`Expected action UUID "${KNOWN_GOOD_SPEC.actionUuid}", got "${sum.actions[0]?.uuid}"`);
      }

      return {
        actual: {
          name: sum.name,
          version: sum.bodyVersion,
          conditionTag: sum.conditions[0]?.tag,
          actionTag: sum.actions[0]?.tag,
          conditionUuid: String(sum.conditions[0]?.uuid),
          actionUuid: String(sum.actions[0]?.uuid),
          notificationTitle: sum.actions[0]?.parameters?.title,
        },
        expected: {
          name: KNOWN_GOOD_SPEC.routineName,
          version: KNOWN_GOOD_SPEC.bodyVersion,
          conditionTag: KNOWN_GOOD_SPEC.conditionTag,
          actionTag: KNOWN_GOOD_SPEC.actionTag,
          conditionUuid: KNOWN_GOOD_SPEC.conditionUuid,
          actionUuid: KNOWN_GOOD_SPEC.actionUuid,
          notificationTitle: KNOWN_GOOD_SPEC.notificationTitle,
        },
        details: 'All known-good fields and 64-bit UUIDs matched exact specification.',
      };
    }
  );

  // Test 4: ZIP-Wrapped Routine Extraction
  await record(
    'test-zip-wrapped-payload',
    'ZIP-Wrapped .rtn Container Extraction',
    'Extracts payload from JSZip compressed archive entry routine_0',
    async () => {
      const zipFile = await createZipWrappedRoutine('Charging_Archived.rtn');
      const decoded = await decodeRoutineFile(zipFile, zipFile.name);

      if (!decoded.isZipWrapped) {
        throw new Error('Decoder failed to detect ZIP wrapper');
      }
      if (decoded.zipEntryName !== 'routine_0') {
        throw new Error(`Expected zip entry name "routine_0", got "${decoded.zipEntryName}"`);
      }
      if (decoded.summary?.name !== KNOWN_GOOD_SPEC.routineName) {
        throw new Error(`Extracted routine name mismatch: "${decoded.summary?.name}"`);
      }

      return {
        actual: { isZipWrapped: true, entryName: decoded.zipEntryName },
        expected: { isZipWrapped: true, entryName: 'routine_0' },
        details: `Successfully unzipped container and decoded internal routine payload (${decoded.payloadSizeBytes} bytes).`,
      };
    }
  );

  // Test 5: AES-GCM 256-bit Decryption Roundtrip
  await record(
    'test-aes-gcm-success',
    'AES-GCM Web Crypto Decryption & Auth',
    'Encrypts with AES-256-GCM and verifies successful decryption and authentication tag verification',
    async () => {
      const { file, key } = await createEncryptedRoutine();
      const decoded = await decodeRoutineFile(file, file.name, { key });

      if (!decoded.body.wasDecrypted) {
        throw new Error('wasDecrypted flag was false after successful decryption');
      }
      if (decoded.header.version !== '2.0') {
        throw new Error(`Expected header version "2.0", got "${decoded.header.version}"`);
      }
      if (decoded.summary?.name !== KNOWN_GOOD_SPEC.routineName) {
        throw new Error(`Decrypted routine name mismatch: "${decoded.summary?.name}"`);
      }

      return {
        actual: {
          wasDecrypted: true,
          routineName: decoded.summary?.name,
          keyBits: decoded.body.aesGcmDetails?.keyLengthBits,
          tagBits: decoded.body.aesGcmDetails?.tagLengthBits,
        },
        expected: {
          wasDecrypted: true,
          routineName: KNOWN_GOOD_SPEC.routineName,
          keyBits: 256,
          tagBits: 128,
        },
        details: `AES-256-GCM decryption succeeded with authentic 128-bit tag and IV ${decoded.body.aesGcmDetails?.ivHex}`,
      };
    }
  );

  // Test 6: Incorrect Key Rejection
  await record(
    'test-aes-gcm-wrong-key',
    'Incorrect AES Key Authentication Rejection',
    'Verifies that attempting decryption with a wrong key triggers an authentication error and does not falsely claim decryption',
    async () => {
      const { file } = await createEncryptedRoutine();
      const wrongKey = 'wrong-password-32bytes-padding!';
      let caught = false;
      let errorMsg = '';

      try {
        await decodeRoutineFile(file, file.name, { key: wrongKey });
      } catch (err: unknown) {
        caught = true;
        errorMsg = err instanceof Error ? err.message : String(err);
      }

      if (!caught) {
        throw new Error('Decoder accepted an incorrect key without failing authentication!');
      }

      return {
        actual: { caught, errorMsg },
        expected: { caught: true, errorIncludes: 'AES-GCM decryption failed' },
        details: `Correctly rejected invalid key with error: "${errorMsg}"`,
      };
    }
  );

  // Test 7: Malformed / Truncated File Detection
  await record(
    'test-boundary-validation',
    'File Offset & Size Boundary Validation',
    'Verifies that a truncated routine payload is rejected with offset boundary error',
    async () => {
      const { payload } = createKnownGoodRoutinePayload();
      // Truncate the file so it cuts off the footer
      const truncated = payload.slice(0, payload.length - 20);

      let caught = false;
      let errorMsg = '';
      try {
        await decodeRoutineFile(truncated, 'Truncated.rtn');
      } catch (err: unknown) {
        caught = true;
        errorMsg = err instanceof Error ? err.message : String(err);
      }

      if (!caught) {
        throw new Error('Decoder failed to detect truncated file!');
      }

      return {
        actual: { caught, errorMsg },
        expected: { caught: true },
        details: `Correctly validated offsets and rejected payload: "${errorMsg}"`,
      };
    }
  );

  return results;
}
