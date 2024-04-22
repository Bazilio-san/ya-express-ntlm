// noinspection JSBitwiseOperatorUsage,JSUnusedLocalSymbols

import { Buffer } from 'buffer';
import { lBlue, reset } from 'af-color';
import { sanitizeText } from '../lib/utils';
import { LarrowR } from '../lib/constants';
import { createMessageType2 } from '../../node-ntlm-core/createMessageType2';
import { debugProxy } from '../debug';

export class NTLMProxyStub {
  public coloredAddress: string = 'stub';

  public id: string;

  constructor (id: string) {
    this.id = id;
  }

  close () {
  }

  async negotiate (messageType1: Buffer): Promise<Buffer> {
    const operationType = `${lBlue}[negotiate]${reset}`;
    return new Promise<Buffer>((resolve) => {
      const messageType2Byf = createMessageType2(messageType1);
      debugProxy(`${LarrowR} ${operationType} PROXY STUB ${lBlue}${sanitizeText(messageType2Byf)}`);
      resolve(messageType2Byf);
    });
  }

  async authenticate (_ntlmAuthenticate: Buffer): Promise<boolean> {
    const operationType = `${lBlue}[authenticate]${reset}`;
    return new Promise<boolean>((resolve) => {
      debugProxy(`${LarrowR} ${operationType} PROXY STUB \t${lBlue}Authenticated = true`);
      resolve(true);
    });
  }
}
