import { AbstractParser } from './AbstractParser';
import {
  getFlags,
  getNtlmEncoding,
  getOSVersionStructure,
  getSecBuf,
  getSecBufData,
} from './parser-utils';
import { NTLMMessageType, NTLMType2, SecurityBuffer, TargetInfo, TargetInfoSubBlock } from './parser-interfaces';
import { ntlmFlags } from './flags';

const fileTimeToDate = (fileTime: number): Date => new Date(fileTime / 10000 - 11644473600000);

const getTargetInfo = (buffer: ArrayBuffer, secBuf: SecurityBuffer): { targetInfoData: TargetInfo, domain: string | undefined } => {
  const dataView = new DataView(buffer, secBuf.offset, secBuf.length);
  const targetInfoData: TargetInfo = [];
  let offset = 0;
  let domain: string | undefined;
  while (offset < secBuf.length) {
    const type = dataView.getUint16(offset, true);
    const length = dataView.getUint16(offset + 2, true);
    const item: TargetInfoSubBlock = {
      type,
      length,
      content: '',
    };
    if (type <= 5) {
      item.content = Buffer.from(
        buffer.slice(
          secBuf.offset + offset + 4,
          secBuf.offset + offset + 4 + length,
        ),
      ).toString('ucs2');
      if (type === 2) {
        domain = item.content;
      }
    }
    if (type === 7) {
      // fileTime.
      const low = dataView.getUint32(offset + 4, true);
      const high = dataView.getUint32(offset + 8, true);
      const date = fileTimeToDate(high * 2 ** 32 + low);
      item.content = date.toISOString();
    }
    targetInfoData.push(item);
    offset += 2 + 2 + length;
  }
  return { targetInfoData, domain };
};

export class NTLMType2Parser extends AbstractParser {
  constructor (buffer: ArrayBuffer) {
    super(buffer);
  }

  parse (): NTLMType2 {
    const targetNameSecBuf = getSecBuf(this.buffer, 12);
    const flag = new Uint32Array(this.buffer.slice(20, 24))[0];
    const result: NTLMType2 = {
      messageType: NTLMMessageType.CHALLENGE_MESSAGE,
      targetNameSecBuf,
      flags: getFlags(ntlmFlags, flag),
      challenge: Buffer.from(this.buffer.slice(24, 32)).toString('hex'),
      targetNameData: getSecBufData(
        this.buffer,
        targetNameSecBuf,
        getNtlmEncoding(flag),
      ),

    };
    if (result.targetNameData) {
      result.domain = result.targetNameData;
    }
    if (targetNameSecBuf.offset !== 32) {
      // NTLM v2
      result.context = Buffer.from(this.buffer.slice(32, 40)).toString('hex');
      result.targetInfoSecBuf = getSecBuf(this.buffer, 40);

      const { targetInfoData, domain } = getTargetInfo(this.buffer, result.targetInfoSecBuf);
      result.targetInfoData = targetInfoData;
      if (domain) {
        result.domain = domain;
      }
    }

    if (targetNameSecBuf.offset !== 48) {
      // NTLM version 3: OS Version structure.
      result.osVersionStructure = getOSVersionStructure(this.buffer, 48);
    }

    return result;
  }
}
