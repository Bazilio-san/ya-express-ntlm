import { Buffer } from 'buffer';
import { NTLMFlag, NTLMTypeFlags } from './core';
import { getSecBuf, getSecBufData } from '../ntlm-parser/parser-utils';

export interface Type1MessageOptions {
  readonly domain: string;
  readonly workstation: string;
}

export const getSuppliedDomainData = (messageType1: Buffer): string => {
  const buf = messageType1.buffer.slice(messageType1.byteOffset, messageType1.byteOffset + messageType1.byteLength);
  const suppliedDomain = getSecBuf(buf, 16);
  return getSecBufData(buf, suppliedDomain, 'ascii');
};

export const createMessageType1Buf = (options: Type1MessageOptions): Buffer => {
  const domain = encodeURIComponent(options.domain.toUpperCase());
  const workstation = encodeURIComponent(options.workstation.toUpperCase());
  const protocol = 'NTLMSSP\0';

  const BODY_LENGTH = 40;

  let type1flags = NTLMTypeFlags.TYPE1_FLAGS;
  if (!domain || domain === '') type1flags -= NTLMFlag.NegotiateOemDomainSupplied;

  let pos = 0;
  const buf = Buffer.alloc(BODY_LENGTH + domain.length + workstation.length);

  // protocol
  pos += buf.write(protocol, pos, protocol.length);
  // type 1
  pos = buf.writeUInt32LE(1, pos);
  // TYPE1 flag
  pos = buf.writeUInt32LE(type1flags, pos);

  // domain length
  pos = buf.writeUInt16LE(domain.length, pos);
  // domain max length
  pos = buf.writeUInt16LE(domain.length, pos);
  // domain buffer offset
  pos = buf.writeUInt32LE(BODY_LENGTH + workstation.length, pos);

  // workstation length
  pos = buf.writeUInt16LE(workstation.length, pos);
  // workstation max length
  pos = buf.writeUInt16LE(workstation.length, pos);
  // workstation buffer offset
  pos = buf.writeUInt32LE(BODY_LENGTH, pos);

  // ProductMajorVersion
  pos = buf.writeUInt8(5, pos);
  // ProductMinorVersion
  pos = buf.writeUInt8(1, pos);
  // ProductBuild
  pos = buf.writeUInt16LE(2600, pos);

  // VersionReserved1
  pos = buf.writeUInt8(0, pos);
  // VersionReserved2
  pos = buf.writeUInt8(0, pos);
  // VersionReserved3
  pos = buf.writeUInt8(0, pos);
  // NTLMRevisionCurrent
  pos = buf.writeUInt8(15, pos);

  // length checks is to fix issue #46 and possibly #57
  if (workstation.length !== 0) {
    // workstation string
    pos += buf.write(workstation, pos, workstation.length, 'ascii');
  }

  if (domain.length !== 0) {
    // domain string
    buf.write(domain, pos, domain.length, 'ascii');
  }

  return buf;
};

export const createMessageType1 = (options: Type1MessageOptions): string => {
  const buf = createMessageType1Buf(options);
  return `NTLM ${buf.toString('base64')}`;
};
