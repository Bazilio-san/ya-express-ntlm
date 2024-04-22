import {
  Flag,
  NTLMEncoding,
  OSVersionStructure,
  SecurityBuffer,
} from './parser-interfaces';

export function getSecBuf (buffer: ArrayBuffer, offset: number): SecurityBuffer {
  const dataView = new DataView(buffer, offset);
  return {
    length: dataView.getInt16(0, true), // short little endian
    allocated: dataView.getInt16(2, true), // short little endian
    offset: dataView.getInt32(4, true), // long little endian
  };
}

export function getOSVersionStructure (
  buffer: ArrayBuffer,
  offset: number,
): OSVersionStructure {
  const dataView = new DataView(buffer, offset);
  return {
    majorVersion: dataView.getInt8(0), // byte
    minorVersion: dataView.getInt8(1), // byte
    buildNumber: dataView.getInt16(2, true), // short little endian
    unknown: dataView.getInt32(4, false), // long
  };
}

export function getSecBufData (
  buffer: ArrayBuffer,
  secBuf: SecurityBuffer,
  encoding: NTLMEncoding,
): string {
  const buf = buffer.slice(secBuf.offset, secBuf.offset + secBuf.length);
  return Buffer.from(buf).toString(encoding);
}

export function getNtlmEncoding (flag: number): NTLMEncoding {
  const unicode = 0x1; // NTLMSSP_NEGOTIATE_UNICODE
  if (flag | unicode) {
    return 'ucs2';
  }
  return 'utf8';
}

export const getNtLmResponseData = <T> (buffer: ArrayBuffer, secBuf: SecurityBuffer): T => ({ hex: getSecBufData(buffer, secBuf, 'hex') } as T);

export const toHex = (buffer: ArrayBuffer): string => Buffer.from(buffer).toString('hex');

export function getFlags (flags: Flag[], value: number): string {
  const str = flags
    .filter((flag) => value & flag.value)
    .map((flag) => flag.label)
    .join(' ');
  return str.replace(/NTLMSSP_NEGOTIATE_/g, '');
}

export function decode (base64: string): ArrayBuffer {
  const b = Buffer.from(base64, 'base64');
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
