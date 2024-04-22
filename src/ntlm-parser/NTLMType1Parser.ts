import { AbstractParser } from './AbstractParser';
import {
  getFlags,
  getOSVersionStructure,
  getSecBuf,
  getSecBufData,
} from './parser-utils';
import { NTLMMessageType, NTLMType1 } from './parser-interfaces';
import { ntlmFlags } from './flags';

export class NTLMType1Parser extends AbstractParser {
  // eslint-disable-next-line no-useless-constructor
  constructor (buffer: ArrayBuffer) {
    super(buffer);
  }

  parse (): NTLMType1 {
    const flag = new Uint32Array(this.buffer.slice(12, 16))[0];
    const result: NTLMType1 = {
      messageType: NTLMMessageType.NEGOTIATE_MESSAGE,
      flags: getFlags(ntlmFlags, flag),
    };

    if (this.buffer.byteLength === 16) {
      // NTLM version 1.
      return result;
    }
    result.suppliedDomain = getSecBuf(this.buffer, 16);
    result.suppliedWorkstation = getSecBuf(this.buffer, 24);

    if (result.suppliedDomain.offset !== 32) {
      // NTLM version 3: OS Version structure.
      result.osVersionStructure = getOSVersionStructure(this.buffer, 32);
    }

    result.domain = getSecBufData(
      this.buffer,
      result.suppliedDomain,
      'ascii',
    );

    result.workstation = getSecBufData(
      this.buffer,
      result.suppliedWorkstation,
      'ascii',
    );

    return result;
  }
}
