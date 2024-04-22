import assert from 'assert';
import { Buffer } from 'buffer';
import * as utils from './utils';

export const makeTLV = (derType: number, payload: string | Buffer): Buffer => {
  if (typeof payload === 'string') {
    payload = Buffer.from(payload);
  }

  let tlv: Buffer;
  let offset: number;
  if (payload.length < 128) {
    tlv = Buffer.alloc(1 + 1 + payload.length);
    tlv.writeUInt8(derType, 0);
    tlv.writeUInt8(payload.length, 1);
    offset = 2;
  } else if (payload.length < 256) {
    tlv = Buffer.alloc(1 + 2 + payload.length);
    tlv.writeUInt8(derType, 0);
    tlv.writeUInt8(utils.toBinary('10000001'), 1); // Number of length bytes = 1
    tlv.writeUInt8(payload.length, 2);
    offset = 3;
  } else {
    tlv = Buffer.alloc(1 + 3 + payload.length);
    tlv.writeUInt8(derType, 0);
    tlv.writeUInt8(utils.toBinary('10000010'), 1); // Number of length bytes = 2
    tlv.writeUInt16BE(payload.length, 2);
    offset = 4;
  }

  for (let i = 0; i < payload.length; i++) {
    tlv.writeUInt8(payload.readUInt8(i), offset++);
  }
  return tlv;
};

export const makeINT = (num: number, tag?: number): Buffer => {
  if (!tag) {
    tag = 0x02;
  }

  let payload: Buffer;

  if (num <= 0) {
    payload = Buffer.from('\0');
  } else {
    payload = Buffer.alloc(0);
    while (num > 0) {
      const buf: Buffer = Buffer.alloc(1);
      buf.writeUInt8(num & 255, 0);
      // @ts-ignore
      payload = buf + payload;
      num >>>= 8;
    }
  }
  return makeTLV(tag, payload);
};

export const makeSEQ = (payload: string | Buffer): Buffer => makeTLV(0x30, payload);

export const makeOctStr = (payload: string | Buffer): Buffer => makeTLV(0x04, payload);

export const parseLen = (berObj: Buffer): [number, number] => {
  let length = berObj.readUInt8(1);

  if (length < 128) {
    return [length, 2];
  }

  const nLength: number = length & utils.toBinary('01111111');
  length = 0;

  for (let i = 2; i < 2 + nLength; i++) {
    length = length * 256 + berObj.readUInt8(i);
  }
  return [length, 2 + nLength];
};

export const parseTLV = (derType: number, derObj: Buffer): Buffer => {
  if (derObj.readUInt8(0) !== derType) {
    throw new Error(`BER element ${derObj.toString('hex')} does not start type 0x${derType.toString(16)}`);
  }
  const lengths = parseLen(derObj);
  const length = lengths[0];
  const pStart = lengths[1];

  if (derObj.length !== length + pStart) {
    throw new Error(`BER payload ${derObj.toString('hex')} is not ${length} bytes long (type 0x${derType.toString(16)}).`);
  }
  return derObj.subarray(pStart);
};

export const parseTLV2 = (derType: number, derObj: Buffer): [Buffer, Buffer] => {
  if (derObj.readUInt8(0) !== derType) {
    throw new Error(`BER element ${derObj.toString('hex')} does not start type 0x${derType.toString(16)}`);
  }
  const lengths = parseLen(derObj);
  const length = lengths[0];
  const pStart = lengths[1];

  if (derObj.length < length + pStart) {
    throw new Error(`BER payload ${derObj.toString('hex')} is shorter than expected (${length} bytes, type 0x${derType.toString(16)}).`);
  }
  return [derObj.subarray(pStart, pStart + length), derObj.subarray(pStart + length)];
};

export const parseINT = (payload: Buffer, tag: number = 0x02): number => {
  const res = parseTLV(tag, payload);
  let value = 0;
  assert.equal(res.readUInt8(0) & utils.toBinary('10000000'), 0x00);
  for (let i = 0; i < res.length; i++) {
    value = value * 256 + res.readUInt8(i);
  }
  return value;
};

export const parseINT2 = (payload: Buffer, tag: number = 0x02): [number, Buffer] => {
  const [res0, res1] = parseTLV2(tag, payload);
  let value = 0;
  assert.equal(res0.readUInt8(0) & utils.toBinary('10000000'), 0x00);
  for (let i = 0; i < res0.length; i++) {
    value = value * 256 + res0.readUInt8(i);
  }
  return [value, res1];
};

// export const parseENUM = (payload: Buffer): number => parseINT(payload, 0x0A);
export const parseENUM2 = (payload: Buffer): [number, Buffer] => parseINT2(payload, 0x0A);

export const parseSEQ = (payload: Buffer): Buffer => parseTLV(0x30, payload);
// export const parseSEQ2 = (payload: Buffer): [Buffer, Buffer] => parseTLV2(0x30, payload);

// export const parseOctStr = (payload: Buffer): Buffer => parseTLV(0x04, payload);
export const parseOctStr2 = (payload: Buffer): [Buffer, Buffer] => parseTLV2(0x04, payload);
