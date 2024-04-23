// noinspection JSBitwiseOperatorUsage,JSUnusedLocalSymbols

import { Buffer } from 'buffer';
import { getSuppliedDomainData } from './createMessageType1';

const NEGOTIATE_UNICODE = 1;
const NEGOTIATE_OEM = 1 << 1;
const REQUEST_TARGET = 1 << 2;
const NEGOTIATE_NTLM_KEY = 1 << 9;
const TARGET_TYPE_DOMAIN = 1 << 16;
const NEGOTIATE_NTLM2_KEY = 1 << 19;
const NEGOTIATE_TARGET_INFO = 1 << 23;

export const createMessageType2 = (messageType1: Buffer): Buffer => {
  const targetName = getSuppliedDomainData(messageType1);

  let challengeFlags = REQUEST_TARGET | TARGET_TYPE_DOMAIN;

  // Follow requested NTLM protocol version
  const requestFlags = messageType1.readUInt32LE(12);
  const ntlmVersion = requestFlags & NEGOTIATE_NTLM2_KEY ? 2 : 1;
  const useUnicode = requestFlags & NEGOTIATE_UNICODE;
  let headerLen: number;
  let dataLen: number;

  let targetNameBufferLen: number;

  if (useUnicode) {
    challengeFlags |= NEGOTIATE_UNICODE;
    targetNameBufferLen = targetName.length * 2;
  } else {
    challengeFlags |= NEGOTIATE_OEM;
    targetNameBufferLen = targetName.length;
  }

  if (ntlmVersion === 2) {
    challengeFlags |= NEGOTIATE_NTLM2_KEY | NEGOTIATE_TARGET_INFO;
    headerLen = 40 + 8;
    dataLen = targetNameBufferLen + ((2 * targetName.length) + 8);
  } else {
    challengeFlags |= NEGOTIATE_NTLM_KEY;
    headerLen = 40;
    dataLen = targetNameBufferLen;
  }

  const messageType2: Buffer = Buffer.alloc(headerLen + dataLen);
  let offset = 0;

  const header = 'NTLMSSP\0';
  offset += messageType2.write(header, 0, 'ascii');

  // Type 2 message
  offset = messageType2.writeUInt32LE(0x00000002, offset);

  // Target name security buffer
  offset = messageType2.writeUInt16LE(targetNameBufferLen, offset);
  offset = messageType2.writeUInt16LE(targetNameBufferLen, offset);
  offset = messageType2.writeUInt32LE(headerLen, offset);

  // Flags
  offset = messageType2.writeUInt32LE(challengeFlags, offset);

  // Server challenge
  offset = messageType2.writeUInt32LE(0x89abcdef, offset);
  offset = messageType2.writeUInt32LE(0x01234567, offset);

  // Context
  offset = messageType2.writeUInt32LE(0, offset);
  offset = messageType2.writeUInt32LE(0, offset);

  if (ntlmVersion === 2) {
    // Target info security buffer
    offset = messageType2.writeUInt16LE(targetName.length * 2 + 8, offset);
    offset = messageType2.writeUInt16LE(targetName.length * 2 + 8, offset);
    offset = messageType2.writeUInt32LE(headerLen + targetNameBufferLen, offset);
  }

  // Target name data
  offset += messageType2.write(targetName, offset, useUnicode ? 'ucs2' : 'ascii');

  if (ntlmVersion === 2) {
    // Target info data
    offset = messageType2.writeUInt16LE(0x0002, offset); // Domain
    offset = messageType2.writeUInt16LE(targetName.length * 2, offset);
    offset += messageType2.write(targetName, offset, 'ucs2');
    offset = messageType2.writeUInt16LE(0x0000, offset); // Terminator block
    messageType2.writeUInt16LE(0, offset);
  }

  return messageType2;
};
