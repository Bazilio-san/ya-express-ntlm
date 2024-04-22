import { NTLMFlag, Type2Message } from './core';

export const parseMessageType2 = (rawMsg: string): Type2Message => {
  const match = rawMsg.match(/^NTLM\s+(.+?)(,|\s+|$)/);

  if (!match?.[1]) {
    throw new Error("Couldn't find NTLM in the message type2 coming from the server");
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
