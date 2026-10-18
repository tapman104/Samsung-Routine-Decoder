import JSZip from 'jszip';
import { RoutineDecodedOutput } from './routineDecoder';
import { KNOWN_GOOD_SPEC } from './sampleData';

export function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadHeaderJson(decoded: RoutineDecodedOutput): void {
  const blob = new Blob([decoded.header.formattedText], { type: 'application/json;charset=utf-8' });
  saveBlob(`${decoded.fileName}.header.json`, blob);
}

export function downloadFooterJson(decoded: RoutineDecodedOutput): void {
  const blob = new Blob([decoded.footer.formattedText], { type: 'application/json;charset=utf-8' });
  saveBlob(`${decoded.fileName}.footer.json`, blob);
}

export function downloadRawBodyBin(decoded: RoutineDecodedOutput): void {
  const blob = new Blob([decoded.body.rawEncryptedBytes as BlobPart], { type: 'application/octet-stream' });
  saveBlob(`${decoded.fileName}.body.raw.bin`, blob);
}

export function downloadDecryptedBody(decoded: RoutineDecodedOutput): void {
  if (decoded.body.formattedJsonText) {
    const blob = new Blob([decoded.body.formattedJsonText], { type: 'application/json;charset=utf-8' });
    saveBlob(`${decoded.fileName}.body.decoded.json`, blob);
  } else if (decoded.body.text) {
    const blob = new Blob([decoded.body.text], { type: 'text/plain;charset=utf-8' });
    saveBlob(`${decoded.fileName}.body.decoded.txt`, blob);
  } else {
    const blob = new Blob([decoded.body.processedBytes as BlobPart], { type: 'application/octet-stream' });
    saveBlob(`${decoded.fileName}.body.processed.bin`, blob);
  }
}

export async function downloadAllBundleZip(decoded: RoutineDecodedOutput): Promise<void> {
  const zip = new JSZip();

  // Header & Footer JSON
  zip.file('header.json', decoded.header.formattedText);
  zip.file('footer.json', decoded.footer.formattedText);

  // Raw body bytes as extracted from file
  zip.file('body.raw.bin', decoded.body.rawEncryptedBytes);

  // Processed / Decrypted body
  if (decoded.body.formattedJsonText) {
    zip.file('body.decoded.json', decoded.body.formattedJsonText);
  } else if (decoded.body.text) {
    zip.file('body.decoded.txt', decoded.body.text);
  } else {
    zip.file('body.decrypted.bin', decoded.body.processedBytes);
  }

  // Generate metadata / analysis report
  const reportLines = [
    '===========================================================',
    '             SAMSUNG ROUTINE DECODER ANALYSIS REPORT       ',
    '===========================================================',
    `File Name:          ${decoded.fileName}`,
    `Original File Size: ${decoded.fileSizeBytes} bytes`,
    `Payload Size:       ${decoded.payloadSizeBytes} bytes`,
    `Container Type:     ${decoded.isZipWrapped ? `ZIP Wrapped (entry: ${decoded.zipEntryName})` : 'Raw Binary Payload'}`,
    `Header Version:     ${decoded.header.version}`,
    `Body Size:          ${decoded.header.body_size} bytes`,
    `Footer Size:        ${decoded.header.footer_size} bytes`,
    `Header Null Pads:   ${decoded.header.nullPaddingBytes} bytes`,
    '',
    '--- CRYPTOGRAPHIC STATE ---',
    `Format Requires Encryption: ${decoded.body.isEncryptedVersion ? 'YES (Version >= 2.0)' : 'NO (Version < 2.0, plaintext)'}`,
    `Decryption Executed:         ${decoded.body.wasDecrypted ? 'YES (Web Crypto AES-GCM Authenticated)' : 'NO'}`,
    `Raw / Undecrypted Mode:      ${decoded.body.isRawMode ? 'YES' : 'NO'}`,
  ];

  if (decoded.body.aesGcmDetails) {
    reportLines.push(
      `AES Key Length:              ${decoded.body.aesGcmDetails.keyLengthBits} bits`,
      `Key Input Format:            ${decoded.body.aesGcmDetails.keyCandidateType.toUpperCase()}`,
      `GCM IV (Nonce, 12 bytes):    ${decoded.body.aesGcmDetails.ivHex}`,
      `GCM Tag Length:              ${decoded.body.aesGcmDetails.tagLengthBits} bits`
    );
  }

  reportLines.push(
    '',
    '--- 64-BIT INTEGER INTEGRITY ---',
    `Contains 64-bit Integers:   ${decoded.body.has64BitIntegers ? 'YES (Preserved Losslessly)' : 'NO'}`
  );

  if (decoded.summary) {
    reportLines.push(
      '',
      '--- ROUTINE SUMMARY ---',
      `Routine Name:        ${decoded.summary.name || 'N/A'}`,
      `Body Version:        ${decoded.summary.bodyVersion || 'N/A'}`,
      `Routine UUID:        ${decoded.summary.uuid || 'N/A'}`,
      `Conditions Count:    ${decoded.summary.conditions.length}`,
      `Actions Count:       ${decoded.summary.actions.length}`
    );

    decoded.summary.conditions.forEach((c, i) => {
      reportLines.push(`  Condition #${i + 1}: tag=${c.tag}, uuid=${c.uuid}`);
    });
    decoded.summary.actions.forEach((a, i) => {
      reportLines.push(`  Action #${i + 1}: tag=${a.tag}, uuid=${a.uuid}, title=${a.parameters?.title || 'N/A'}`);
    });
  }

  zip.file('analysis_report.txt', reportLines.join('\n'));

  const blob = await zip.generateAsync({ type: 'blob' });
  saveBlob(`${decoded.fileName}.decoded_bundle.zip`, blob);
}
