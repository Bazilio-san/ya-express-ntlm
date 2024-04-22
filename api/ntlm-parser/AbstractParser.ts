// noinspection JSUnusedGlobalSymbols

import { NTLMMessage, NTLMMessageType } from './parser-interfaces';

export class AbstractParser {
  constructor (protected buffer: ArrayBuffer) {
  }

  parse (): NTLMMessage {
    return { messageType: NTLMMessageType.UNKNOWN };
  }
}
