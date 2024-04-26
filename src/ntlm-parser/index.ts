import { NTLMMessageParsed, NTLMMessageType, NtlmParseOptions } from './parser-interfaces';
import { decode, toHex } from './parser-utils';
import { NTLMType1Parser } from './NTLMType1Parser';
import { NTLMType2Parser } from './NTLMType2Parser';
import { NTLMType3Parser } from './NTLMType3Parser';
import { AbstractParser } from './AbstractParser';

const instantiateFromContent = (buffer: ArrayBuffer) => {
  const str = toHex(buffer);
  const prefix = str.substring(0, 24);
  if (prefix === '4e544c4d5353500001000000') {
    return new NTLMType1Parser(buffer);
  }
  if (prefix === '4e544c4d5353500002000000') {
    return new NTLMType2Parser(buffer);
  }
  if (prefix === '4e544c4d5353500003000000') {
    return new NTLMType3Parser(buffer);
  }
  return new AbstractParser(buffer);
};

export const compactParseResult = (r: any) => {
  if (r.osVersionStructure) {
    const { minorVersion: m1, majorVersion: m2, buildNumber: m3, unknown: m4 } = r.osVersionStructure;
    delete r.osVersionStructure;
    r.osVersion = `${m1}.${m2}.${m3} ${m4}`;
  }
  if (r.messageType === NTLMMessageType.NEGOTIATE_MESSAGE) {
    delete r.suppliedDomain;
    delete r.suppliedWorkstation;
  }
  if (r.messageType === NTLMMessageType.CHALLENGE_MESSAGE) {
    if (r.targetInfoData) {
      r.targetInfoData = r.targetInfoData.map((v) => v.content).filter((v) => String(v).trim());
      delete r.targetNameSecBuf;
      delete r.targetInfoSecBuf;
    }
  }
  if (r.messageType === NTLMMessageType.AUTHENTICATE_MESSAGE) {
    ['sessionKey', 'lmResponse', 'ntlmResponse', 'targetName', 'userName',
      'workstationName', 'sessionKey', 'ntlmResponseData']
      .forEach((p) => {
        delete r[p];
      });
  }
};

export const ntlmParse = (str: string, opts?: Partial<NtlmParseOptions>): NTLMMessageParsed => {
  const defaultOptions: NtlmParseOptions = { encoding: 'base64' };
  const { encoding, compact } = { ...defaultOptions, ...opts };
  if (encoding === 'hex') {
    str = Buffer.from(str, 'hex').toString('base64');
  }
  const buffer = decode(str);
  const parser = instantiateFromContent(buffer);
  const result = parser.parse();
  if (compact) {
    compactParseResult(result);
  }
  return result;
};

export { startCoder } from './coder/coder';
export * from './parser-interfaces';
