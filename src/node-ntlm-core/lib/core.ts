import { DES, Des } from 'des.js';
import { create as createMd4 } from 'js-md4';

import { insertZerosEvery7Bits } from './utils';

export const NTLMFlag = {
  NegotiateUnicode: 0x00_00_00_01,
  NegotiateOEM: 0x00_00_00_02,
  RequestTarget: 0x00_00_00_04,
  Unknown9: 0x00_00_00_08,
  NegotiateSign: 0x00_00_00_10,
  NegotiateSeal: 0x00_00_00_20,
  NegotiateDatagram: 0x00_00_00_40,
  NegotiateLanManagerKey: 0x00_00_00_80,
  Unknown8: 0x00_00_01_00,
  NegotiateNTLM: 0x00_00_02_00,
  NegotiateNTOnly: 0x00_00_04_00,
  Anonymous: 0x00_00_08_00,
  NegotiateOemDomainSupplied: 0x00_00_10_00,
  NegotiateOemWorkstationSupplied: 0x00_00_20_00,
  Unknown6: 0x00_00_40_00,
  NegotiateAlwaysSign: 0x00_00_80_00,
  TargetTypeDomain: 0x00_01_00_00,
  TargetTypeServer: 0x00_02_00_00,
  TargetTypeShare: 0x00_04_00_00,
  NegotiateExtendedSecurity: 0x00_08_00_00,
  NegotiateIdentify: 0x00_10_00_00,
  Unknown5: 0x00_20_00_00,
  RequestNonNTSessionKey: 0x00_40_00_00,
  NegotiateTargetInfo: 0x00_80_00_00,
  Unknown4: 0x01_00_00_00,
  NegotiateVersion: 0x02_00_00_00,
  Unknown3: 0x04_00_00_00,
  Unknown2: 0x08_00_00_00,
  Unknown1: 0x10_00_00_00,
  Negotiate128: 0x20_00_00_00,
  NegotiateKeyExchange: 0x40_00_00_00,
  Negotiate56: 0x80_00_00_00,
} as const;

export const NTLMTypeFlags = {
  TYPE1_FLAGS:
    NTLMFlag.NegotiateUnicode
    + NTLMFlag.NegotiateOEM
    + NTLMFlag.RequestTarget
    + NTLMFlag.NegotiateNTLM
    + NTLMFlag.NegotiateOemDomainSupplied
    + NTLMFlag.NegotiateOemWorkstationSupplied
    + NTLMFlag.NegotiateAlwaysSign
    + NTLMFlag.NegotiateExtendedSecurity
    + NTLMFlag.NegotiateVersion
    + NTLMFlag.Negotiate128
    + NTLMFlag.Negotiate56,
  TYPE2_FLAGS:
    NTLMFlag.NegotiateUnicode
    + NTLMFlag.RequestTarget
    + NTLMFlag.NegotiateNTLM
    + NTLMFlag.NegotiateAlwaysSign
    + NTLMFlag.NegotiateExtendedSecurity
    + NTLMFlag.NegotiateTargetInfo
    + NTLMFlag.NegotiateVersion
    + NTLMFlag.Negotiate128
    + NTLMFlag.Negotiate56,
} as const;

export interface Type2Message {
  signature: Buffer;
  type: number;
  targetNameLen: number;
  targetNameMaxLen: number;
  targetNameOffset: number;
  targetName: Buffer;
  negotiateFlags: number;
  serverChallenge: Buffer;
  reserved: Buffer;
  targetInfoLen?: number;
  targetInfoMaxLen?: number;
  targetInfoOffset?: number;
  targetInfo?: Buffer;
}

export function extractNtlmMessageFromAuthenticateHeader (
  authenticateHeader: string | undefined | null,
): string | undefined {
  // The header may look like this: `Negotiate, NTLM, Basic realm="hidden-realm.example.net"`
  // so extract the 'NTLM' part first
  return (
    authenticateHeader
      ?.split(',')
      .find((part) => part.match(/ *NTLM/))
      ?.trim() ?? undefined
  );
}

export const createDesEncrypt = (key: Buffer): Des => DES.create({ type: 'encrypt', key });

export const createLMHashedPasswordV1 = (password: string) => {
  // fix the password length to 14 bytes
  password = password.toUpperCase();
  const passwordBytes = Buffer.from(password, 'ascii');

  const passwordBytesPadded = Buffer.alloc(14);
  passwordBytesPadded.fill('\0');
  let sourceEnd = 14;
  if (passwordBytes.length < 14) sourceEnd = passwordBytes.length;
  passwordBytes.copy(passwordBytesPadded, 0, 0, sourceEnd);

  // split into 2 parts of 7 bytes:
  const firstPart = passwordBytesPadded.subarray(0, 7);
  const secondPart = passwordBytesPadded.subarray(7);

  function encrypt (buf: Buffer) {
    const key = insertZerosEvery7Bits(buf);
    const des = createDesEncrypt(key);
    return Buffer.from(des.update('KGS!@#$%')); // page 57 in [MS-NLMP]);
  }

  const firstPartEncrypted = encrypt(firstPart);
  const secondPartEncrypted = encrypt(secondPart);

  return Buffer.concat([firstPartEncrypted, secondPartEncrypted]);
};

export const createNTHashedPasswordV1 = (password: string) => {
  const buf = Buffer.from(password, 'utf16le');
  return Buffer.from(createMd4().update(buf).digest());
};
