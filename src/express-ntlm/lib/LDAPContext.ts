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

const RES_CODES = {
  0: 'success',
  1: 'operationsError',
  2: 'protocolError',
  3: 'timeLimitExceeded',
  4: 'sizeLimitExceeded',
  5: 'compareFalse',
  6: 'compareTrue',
  7: 'authMethodNotSupported',
  8: 'strongerAuthRequired',
  10: 'referral',
  11: 'adminLimitExceeded',
  12: 'unavailableCriticalExtension',
  13: 'confidentialityRequired',
  14: 'saslBindInProgress',
  16: 'noSuchAttribute',
  17: 'undefinedAttributeType',
  18: 'inappropriateMatching',
  19: 'constraintViolation',
  20: 'attributeOrValueExists',
  21: 'invalidAttributeSyntax',
  32: 'noSuchObject',
  33: 'aliasProblem',
  34: 'invalidDNSyntax',
  36: 'aliasDereferencingProblem',
  48: 'inappropriateAuthentication',
  49: 'invalidCredentials',
  50: 'insufficientAccessRights',
  51: 'busy',
  52: 'unavailable',
  53: 'unwillingToPerform',
  54: 'loopDetect',
  64: 'namingViolation',
  65: 'objectClassViolation',
  66: 'notAllowedOnNonLeaf',
  67: 'notAllowedOnRDN',
  68: 'entryAlreadyExists',
  69: 'objectClassModsProhibited',
  71: 'affectsMultipleDSAs',
  80: 'other',
};

const getResCodeName = (resultCode: number): string => {
  const resCodeName = RES_CODES[resultCode];
  return resCodeName == null ? String(resultCode) : resCodeName;
};

export class LDAPContext {
  messageID: number = 0;

  makeSessionSetupREQ (ntlmToken: Buffer, messageID: 1 | 2): Buffer {
    const authentication = ASN1.makeTLV(0xA3, concatBuffer(ASN1.makeOctStr('GSS-SPNEGO'), ASN1.makeOctStr(ntlmToken)));
    const bindRequest = ASN1.makeTLV(0x60, concatBuffer(ASN1.makeINT(3), ASN1.makeOctStr(''), authentication));
    this.messageID++;
    return ASN1.makeSEQ(concatBuffer(ASN1.makeINT(messageID), bindRequest));
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
      debugNtlmContext(`${pfx}resultCode: ${getResCodeName(resultCode)}`);
      return { isOk: false };
    }

    const [_matchedDN, data5] = ASN1.parseOctStr2(data4);

    const [_diagnosticMessage, data6] = ASN1.parseOctStr2(data5);

    const serverSaslCreds: Buffer = ASN1.parseTLV(0x87, data6);

    debugNtlmContext(`${pfx}serverSaslCreds: ${serverSaslCreds.toString('utf8')}`);

    return { isOk: true, serverSaslCreds };
  }
}
