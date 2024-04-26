// noinspection ExceptionCaughtLocallyJS

import { lBlue, g } from 'af-color';
import { Buffer } from 'buffer';
import * as ASN1 from './ASN1';
import { concatBuffer } from './utils';
import { debugNtlmContext } from '../debug';

const LDAP_RESULT_CODE = {
  SUCCESS: 0,
  SASL_BIND_IN_PROGRESS: 14,
};

export class LDAPContext {
  messageID: number = 0;

  makeSessionSetupREQ (ntlmToken: Buffer): Buffer {
    const authentication = ASN1.makeTLV(0xA3, concatBuffer(ASN1.makeOctStr('GSS-SPNEGO'), ASN1.makeOctStr(ntlmToken)));
    const bindRequest = ASN1.makeTLV(0x60, concatBuffer(ASN1.makeINT(3), ASN1.makeOctStr(''), authentication));
    this.messageID++;
    return ASN1.makeSEQ(concatBuffer(ASN1.makeINT(this.messageID), bindRequest));
  }

  parseSessionSetupRESP (response: Buffer): { isOk: boolean, serverSaslCreds?: Buffer } {
    const data = ASN1.parseSEQ(response);
    const [messageID, data2] = ASN1.parseINT2(data);

    const pfx = `messageID: ${lBlue}${messageID}${g}: `;

    if (messageID !== this.messageID) {
      throw new Error(`Unexpected MessageID: ${messageID} instead of ${this.messageID}`);
    }

    const [data3, _controls] = ASN1.parseTLV2(0x61, data2);

    const [resultCode, data4] = ASN1.parseENUM2(data3);

    if (resultCode === LDAP_RESULT_CODE.SUCCESS) {
      debugNtlmContext(`${pfx}resultCode: SUCCESS`);
      return { isOk: true };
    }

    if (resultCode !== LDAP_RESULT_CODE.SASL_BIND_IN_PROGRESS) {
      debugNtlmContext(`${pfx}resultCode: SASL_BIND_IN_PROGRESS`);
      return { isOk: false };
    }

    const [_matchedDN, data5] = ASN1.parseOctStr2(data4);

    const [_diagnosticMessage, data6] = ASN1.parseOctStr2(data5);

    const serverSaslCreds: Buffer = ASN1.parseTLV(0x87, data6);

    debugNtlmContext(`${pfx}serverSaslCreds: ${serverSaslCreds.toString('utf8')}`);

    return { isOk: true, serverSaslCreds };
  }
}
