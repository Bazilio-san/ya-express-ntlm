import { createHash, createHmac } from 'node:crypto';
import {
  createDesEncrypt,
  createLMHashedPasswordV1,
  createNTHashedPasswordV1,
  NTLMFlag,
  NTLMTypeFlags,
  Type2Message,
} from './core';
import { insertZerosEvery7Bits } from './utils';

export interface Type3MessageOptions {
  readonly domain: string;
  readonly workstation: string;
  readonly username: string;
  readonly password: string;
  readonly lmPassword?: Buffer;
  readonly ntPassword?: Buffer;
}

const ntlm2srCalcResp = (responseKeyNT: Buffer, serverChallenge: Buffer, clientChallenge: Buffer) => {
  // padding with zeros to make the hash 16 bytes longer
  const lmChallengeResponse = Buffer.alloc(clientChallenge.length + 16);
  lmChallengeResponse.fill('\0');
  clientChallenge.copy(lmChallengeResponse, 0, 0, clientChallenge.length);

  const buf = Buffer.concat([serverChallenge, clientChallenge]);
  const md5 = createHash('md5');
  md5.update(buf);
  const sess = md5.digest();
  const ntChallengeResponse = calcResp(responseKeyNT, sess.subarray(0, 8));

  return {
    lmChallengeResponse,
    ntChallengeResponse,
  };
};

const calcResp = (passwordHash: Buffer, serverChallenge: Buffer): Buffer => {
  // padding with zeros to make the hash 21 bytes long
  const passHashPadded = Buffer.alloc(21);
  passHashPadded.fill('\0');
  passwordHash.copy(passHashPadded, 0, 0, passwordHash.length);

  const resArray: Buffer[] = [];

  let des = createDesEncrypt(insertZerosEvery7Bits(passHashPadded.subarray(0, 7)));
  resArray.push(Buffer.from(des.update(serverChallenge.subarray(0, 8))));

  des = createDesEncrypt(insertZerosEvery7Bits(passHashPadded.subarray(7, 14)));
  resArray.push(Buffer.from(des.update(serverChallenge.subarray(0, 8))));

  des = createDesEncrypt(insertZerosEvery7Bits(passHashPadded.subarray(14, 21)));
  resArray.push(Buffer.from(des.update(serverChallenge.subarray(0, 8))));

  return Buffer.concat(resArray);
};

const hmacMd5 = (key: Buffer, data: Buffer): Buffer => {
  const hmac = createHmac('md5', key);
  hmac.update(data);
  return hmac.digest();
};

const NTOWFv2 = (pwHash: Buffer, user: string, domain: string) => hmacMd5(pwHash, Buffer.from(`${user.toUpperCase()}${domain}`, 'utf16le'));

const calcNtlmv2Resp = (
  pwHash: Buffer,
  username: string,
  domain: string,
  targetInfo: Buffer,
  serverChallenge: Buffer,
  clientChallenge: Buffer,
) => {
  const responseKeyNTLM = NTOWFv2(pwHash, username, domain);

  const lmV2ChallengeResponse = Buffer.concat([
    hmacMd5(responseKeyNTLM, Buffer.concat([serverChallenge, clientChallenge])),
    clientChallenge,
  ]);

  // 11644473600000 = diff between 1970 and 1601
  const now = Date.now();
  const timestamp = (BigInt(now) + BigInt(11_644_473_600_000)) * BigInt(10_000); // we need BigInt to be able to write it to a buffer
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigUInt64LE(timestamp);

  const zero32Bit = Buffer.alloc(4, 0);
  const temp = Buffer.concat([
    // Version
    Buffer.from([0x01, 0x01, 0x00, 0x00]),
    zero32Bit,
    timestampBuffer,
    clientChallenge,
    zero32Bit,
    targetInfo,
    zero32Bit,
  ]);
  const proofString = hmacMd5(responseKeyNTLM, Buffer.concat([serverChallenge, temp]));
  const ntV2ChallengeResponse = Buffer.concat([proofString, temp]);

  return {
    lmChallengeResponse: lmV2ChallengeResponse,
    ntChallengeResponse: ntV2ChallengeResponse,
  };
};

export const parseType2Message = (rawmsg: string): Type2Message => {
  const match = rawmsg.match(/^NTLM\s+(.+?)(,|\s+|$)/);

  if (!match?.[1]) {
    throw new Error("Couldn't find NTLM in the message type2 comming from the server");
  }

  const buf = Buffer.from(match[1], 'base64');

  const signature = buf.subarray(0, 8);
  const type = buf.readInt16LE(8);

  if (type !== 2) {
    throw new Error("Server didn't return a type 2 message");
  }

  const targetNameLen = buf.readInt16LE(12);
  const targetNameMaxLen = buf.readInt16LE(14);
  const targetNameOffset = buf.readInt32LE(16);
  const targetName = buf.subarray(targetNameOffset, targetNameOffset + targetNameMaxLen);

  const negotiateFlags = buf.readInt32LE(20);
  const serverChallenge = buf.subarray(24, 32);
  const reserved = buf.subarray(32, 40);

  const msg: Type2Message = {
    signature,
    type,
    targetNameLen,
    targetNameMaxLen,
    targetNameOffset,
    targetName,
    negotiateFlags,
    serverChallenge,
    reserved,
  };

  if (negotiateFlags & NTLMFlag.NegotiateTargetInfo) {
    msg.targetInfoLen = buf.readInt16LE(40);
    msg.targetInfoMaxLen = buf.readInt16LE(42);
    msg.targetInfoOffset = buf.readInt32LE(44);
    msg.targetInfo = buf.subarray(msg.targetInfoOffset, msg.targetInfoOffset + msg.targetInfoLen);
  }

  return msg;
};

export const createMessageType3 = (msg2: Type2Message, options: Type3MessageOptions): string => {
  const nonce = msg2.serverChallenge;
  const { username } = options;
  const { password } = options;
  const { lmPassword } = options;
  const { ntPassword } = options;
  const { negotiateFlags } = msg2;

  const isUnicode = negotiateFlags & NTLMFlag.NegotiateUnicode;
  const isNegotiateExtendedSecurity = negotiateFlags & NTLMFlag.NegotiateExtendedSecurity;

  const BODY_LENGTH = 72;

  const domainName = encodeURIComponent(options.domain.toUpperCase());
  const workstation = encodeURIComponent(options.workstation.toUpperCase());

  let workstationBytes: Buffer;
  let domainNameBytes: Buffer;
  let usernameBytes: Buffer;
  let encryptedRandomSessionKeyBytes: Buffer;

  const encryptedRandomSessionKey = '';
  if (isUnicode) {
    workstationBytes = Buffer.from(workstation, 'utf16le');
    domainNameBytes = Buffer.from(domainName, 'utf16le');
    usernameBytes = Buffer.from(username, 'utf16le');
    encryptedRandomSessionKeyBytes = Buffer.from(encryptedRandomSessionKey, 'utf16le');
  } else {
    workstationBytes = Buffer.from(workstation, 'ascii');
    domainNameBytes = Buffer.from(domainName, 'ascii');
    usernameBytes = Buffer.from(username, 'ascii');
    encryptedRandomSessionKeyBytes = Buffer.from(encryptedRandomSessionKey, 'ascii');
  }

  let lmChallengeResponse = calcResp(lmPassword != null ? lmPassword : createLMHashedPasswordV1(password), nonce);
  let ntChallengeResponse = calcResp(ntPassword != null ? ntPassword : createNTHashedPasswordV1(password), nonce);

  if (isNegotiateExtendedSecurity) {
    /*
         * NTLMv2 extended security is enabled. While this technically can mean NTLMv2 extended security with NTLMv1 protocol,
         * servers that support extended security likely also support NTLMv2, so use NTLMv2.
         * This is also how curl implements NTLMv2 "detection".
         * By using NTLMv2, this supports communication with servers that forbid the use of NTLMv1 (e.g. via windows policies)
         *
         * However, the target info is needed to construct the NTLMv2 response so if it can't be negotiated,
         * fall back to NTLMv1 with NTLMv2 extended security.
         */
    const pwHash = ntPassword != null ? ntPassword : createNTHashedPasswordV1(password);
    let clientChallenge = '';
    for (let i = 0; i < 8; i++) {
      clientChallenge += String.fromCharCode(Math.floor(Math.random() * 256));
    }
    const clientChallengeBytes = Buffer.from(clientChallenge, 'ascii');
    const challenges = msg2.targetInfo
      ? calcNtlmv2Resp(pwHash, username, domainName, msg2.targetInfo, nonce, clientChallengeBytes)
      : ntlm2srCalcResp(pwHash, nonce, clientChallengeBytes);
    ({ lmChallengeResponse, ntChallengeResponse } = challenges);
  }

  const signature = 'NTLMSSP\0';

  let pos = 0;

  const buf = Buffer.alloc(
    BODY_LENGTH
    + domainNameBytes.length
    + usernameBytes.length
    + workstationBytes.length
    + lmChallengeResponse.length
    + ntChallengeResponse.length
    + encryptedRandomSessionKeyBytes.length,
  );

  pos = buf.write(signature, pos, signature.length);
  // type 1
  pos = buf.writeUInt32LE(3, pos);

  // LmChallengeResponseLen
  pos = buf.writeUInt16LE(lmChallengeResponse.length, pos);
  // LmChallengeResponseMaxLen
  pos = buf.writeUInt16LE(lmChallengeResponse.length, pos);
  // LmChallengeResponseOffset
  pos = buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length + usernameBytes.length + workstationBytes.length, pos);

  // NtChallengeResponseLen
  pos = buf.writeUInt16LE(ntChallengeResponse.length, pos);
  // NtChallengeResponseMaxLen
  pos = buf.writeUInt16LE(ntChallengeResponse.length, pos);
  // NtChallengeResponseOffset
  pos = buf.writeUInt32LE(
    BODY_LENGTH
    + domainNameBytes.length
    + usernameBytes.length
    + workstationBytes.length
    + lmChallengeResponse.length,
    pos,
  );

  // DomainNameLen
  pos = buf.writeUInt16LE(domainNameBytes.length, pos);
  // DomainNameMaxLen
  pos = buf.writeUInt16LE(domainNameBytes.length, pos);
  // DomainNameOffset
  pos = buf.writeUInt32LE(BODY_LENGTH, pos);

  // UserNameLen
  pos = buf.writeUInt16LE(usernameBytes.length, pos);
  // UserNameMaxLen
  pos = buf.writeUInt16LE(usernameBytes.length, pos);
  // UserNameOffset
  pos = buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length, pos);

  // WorkstationLen
  pos = buf.writeUInt16LE(workstationBytes.length, pos);
  // WorkstationMaxLen
  pos = buf.writeUInt16LE(workstationBytes.length, pos);
  // WorkstationOffset
  pos = buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length + usernameBytes.length, pos);

  // EncryptedRandomSessionKeyLen
  pos = buf.writeUInt16LE(encryptedRandomSessionKeyBytes.length, pos);
  // EncryptedRandomSessionKeyMaxLen
  pos = buf.writeUInt16LE(encryptedRandomSessionKeyBytes.length, pos);
  // EncryptedRandomSessionKeyOffset
  pos = buf.writeUInt32LE(
    BODY_LENGTH
    + domainNameBytes.length
    + usernameBytes.length
    + workstationBytes.length
    + lmChallengeResponse.length
    + ntChallengeResponse.length,
    pos,
  );

  // NegotiateFlags =
  pos = buf.writeUInt32LE(NTLMTypeFlags.TYPE2_FLAGS, pos);

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

  pos += domainNameBytes.copy(buf, pos);
  pos += usernameBytes.copy(buf, pos);
  pos += workstationBytes.copy(buf, pos);
  pos += lmChallengeResponse.copy(buf, pos);
  pos += ntChallengeResponse.copy(buf, pos);
  encryptedRandomSessionKeyBytes.copy(buf, pos);

  return `NTLM ${buf.toString('base64')}`;
};
