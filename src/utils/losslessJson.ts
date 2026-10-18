/**
 * Lossless JSON Parser & Serializer
 * Preserves 64-bit integers and arbitrary-precision numbers exactly without rounding.
 * Standard JavaScript JSON.parse rounds integers exceeding 2^53 - 1 (e.g. 7662462504390312209 -> 7662462504390312000).
 * This module guarantees exact string representations and AST nodes.
 */

export class LosslessNumber {
  public readonly isLosslessNumber = true;
  constructor(public readonly raw: string) {}

  toString(): string {
    return this.raw;
  }

  valueOf(): string {
    return this.raw;
  }

  toJSON(): string {
    return this.raw;
  }

  toBigInt(): bigint | null {
    try {
      return BigInt(this.raw);
    } catch {
      return null;
    }
  }

  toNumber(): number {
    return Number(this.raw);
  }

  isLargeInteger(): boolean {
    if (!/^-?\d+$/.test(this.raw)) return false;
    try {
      const bi = BigInt(this.raw);
      return bi > BigInt(Number.MAX_SAFE_INTEGER) || bi < BigInt(Number.MIN_SAFE_INTEGER);
    } catch {
      return this.raw.length > 15;
    }
  }
}

export function isLosslessNumber(val: unknown): val is LosslessNumber {
  return typeof val === 'object' && val !== null && (val as LosslessNumber).isLosslessNumber === true;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | LosslessNumber
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Parses JSON string while preserving all numbers losslessly.
 * Numbers exceeding Number.MAX_SAFE_INTEGER or MIN_SAFE_INTEGER are instantiated as LosslessNumber.
 * Normal numbers can be kept as standard JS numbers or LosslessNumber.
 */
export function parseLosslessJson(jsonText: string): JsonValue {
  let pos = 0;
  const str = jsonText.trim();
  const len = str.length;

  function skipWhitespace(): void {
    while (pos < len) {
      const ch = str.charCodeAt(pos);
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
        pos++;
      } else {
        break;
      }
    }
  }

  function parseString(): string {
    pos++; // skip opening quote
    let result = '';
    while (pos < len) {
      const ch = str[pos];
      if (ch === '"') {
        pos++; // skip closing quote
        return result;
      }
      if (ch === '\\') {
        pos++;
        if (pos >= len) throw new Error('Unterminated string escape');
        const esc = str[pos];
        switch (esc) {
          case '"': result += '"'; break;
          case '\\': result += '\\'; break;
          case '/': result += '/'; break;
          case 'b': result += '\b'; break;
          case 'f': result += '\f'; break;
          case 'n': result += '\n'; break;
          case 'r': result += '\r'; break;
          case 't': result += '\t'; break;
          case 'u': {
            const hex = str.slice(pos + 1, pos + 5);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw new Error(`Invalid unicode escape \\u${hex}`);
            }
            result += String.fromCharCode(parseInt(hex, 16));
            pos += 4;
            break;
          }
          default:
            result += esc;
        }
        pos++;
      } else {
        result += ch;
        pos++;
      }
    }
    throw new Error('Unterminated string');
  }

  function parseNumber(): number | LosslessNumber {
    const start = pos;
    if (str[pos] === '-') pos++;
    while (pos < len && str[pos] >= '0' && str[pos] <= '9') pos++;
    if (pos < len && str[pos] === '.') {
      pos++;
      while (pos < len && str[pos] >= '0' && str[pos] <= '9') pos++;
    }
    if (pos < len && (str[pos] === 'e' || str[pos] === 'E')) {
      pos++;
      if (pos < len && (str[pos] === '+' || str[pos] === '-')) pos++;
      while (pos < len && str[pos] >= '0' && str[pos] <= '9') pos++;
    }
    const numStr = str.slice(start, pos);
    if (!numStr || numStr === '-') {
      throw new Error(`Invalid number at position ${start}`);
    }

    // Check if integer and exceeds safe bounds
    if (/^-?\d+$/.test(numStr)) {
      try {
        const bi = BigInt(numStr);
        if (bi > BigInt(Number.MAX_SAFE_INTEGER) || bi < BigInt(Number.MIN_SAFE_INTEGER)) {
          return new LosslessNumber(numStr);
        }
      } catch {
        return new LosslessNumber(numStr);
      }
    }

    // For floating point numbers that might lose precision or if length is high:
    if (numStr.length > 15) {
      return new LosslessNumber(numStr);
    }

    const n = Number(numStr);
    if (Number.isNaN(n)) {
      return new LosslessNumber(numStr);
    }
    return n;
  }

  function parseArray(): JsonValue[] {
    pos++; // skip '['
    skipWhitespace();
    const arr: JsonValue[] = [];
    if (pos < len && str[pos] === ']') {
      pos++;
      return arr;
    }
    while (pos < len) {
      skipWhitespace();
      arr.push(parseValue());
      skipWhitespace();
      if (pos >= len) throw new Error('Unterminated array');
      if (str[pos] === ',') {
        pos++;
      } else if (str[pos] === ']') {
        pos++;
        return arr;
      } else {
        throw new Error(`Expected ',' or ']' at position ${pos}`);
      }
    }
    throw new Error('Unterminated array');
  }

  function parseObject(): { [key: string]: JsonValue } {
    pos++; // skip '{'
    skipWhitespace();
    const obj: { [key: string]: JsonValue } = {};
    if (pos < len && str[pos] === '}') {
      pos++;
      return obj;
    }
    while (pos < len) {
      skipWhitespace();
      if (str[pos] !== '"') {
        throw new Error(`Expected string key in object at position ${pos}, found '${str[pos]}'`);
      }
      const key = parseString();
      skipWhitespace();
      if (pos >= len || str[pos] !== ':') {
        throw new Error(`Expected ':' after key "${key}" at position ${pos}`);
      }
      pos++; // skip ':'
      skipWhitespace();
      const val = parseValue();
      obj[key] = val;
      skipWhitespace();
      if (pos >= len) throw new Error('Unterminated object');
      if (str[pos] === ',') {
        pos++;
      } else if (str[pos] === '}') {
        pos++;
        return obj;
      } else {
        throw new Error(`Expected ',' or '}' at position ${pos}`);
      }
    }
    throw new Error('Unterminated object');
  }

  function parseValue(): JsonValue {
    skipWhitespace();
    if (pos >= len) throw new Error('Unexpected end of JSON input');
    const ch = str[pos];
    if (ch === '{') return parseObject();
    if (ch === '[') return parseArray();
    if (ch === '"') return parseString();
    if (ch === 't' && str.startsWith('true', pos)) {
      pos += 4;
      return true;
    }
    if (ch === 'f' && str.startsWith('false', pos)) {
      pos += 5;
      return false;
    }
    if (ch === 'n' && str.startsWith('null', pos)) {
      pos += 4;
      return null;
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      return parseNumber();
    }
    throw new Error(`Unexpected character '${ch}' at position ${pos}`);
  }

  const result = parseValue();
  skipWhitespace();
  if (pos < len) {
    throw new Error(`Unexpected extra data after JSON at position ${pos}`);
  }
  return result;
}

/**
 * Stringifies a JsonValue losslessly without quoting LosslessNumbers.
 * Preserves exact digits of 64-bit UUIDs and large integers.
 */
export function stringifyLossless(val: JsonValue, indent = 2, currentIndent = 0): string {
  const pad = ' '.repeat(currentIndent);
  const nextPad = ' '.repeat(currentIndent + indent);

  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (isLosslessNumber(val)) return val.raw;
  if (typeof val === 'bigint') return (val as bigint).toString();
  if (typeof val === 'string') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const lines = val.map(item => `${nextPad}${stringifyLossless(item, indent, currentIndent + indent)}`);
    return `[\n${lines.join(',\n')}\n${pad}]`;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const lines = keys.map(k => {
      const formattedKey = JSON.stringify(k);
      const formattedVal = stringifyLossless(val[k], indent, currentIndent + indent);
      return `${nextPad}${formattedKey}: ${formattedVal}`;
    });
    return `{\n${lines.join(',\n')}\n${pad}}`;
  }

  return String(val);
}

/**
 * Checks whether text contains numbers that would be corrupted by standard JSON.parse.
 */
export function hasPotentiallyUnsafeBigInt(jsonText: string): boolean {
  // Strip string literals to avoid false positives on strings with digits
  const stripped = jsonText.replace(/"(?:[^"\\]|\\.)*"/g, '');
  // Match any sequence of 16 or more consecutive digits
  return /\b\d{16,}\b/.test(stripped);
}
