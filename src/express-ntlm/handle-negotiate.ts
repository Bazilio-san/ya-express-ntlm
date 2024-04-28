import { Buffer } from 'buffer';
import { blue, reset } from 'af-color';
import { IRsn } from '../interfaces';
import { proxyCache } from './proxy/ProxyCache';
import { debugNtlmAuthFlow, hnColor, hvOutColor } from './debug';
import { ntlmParse, NTLMType2 } from '../ntlm-parser';
import { Larrow } from './lib/constants';

export const handleNegotiate = async (rsn: IRsn, messageType1: Buffer) => {
  const { res, options } = rsn;
  try {
    rsn.payload = messageType1;
    const proxyId = options.getProxyId(rsn);
    const messageType2 = await proxyCache.addOrReplace(rsn, proxyId, messageType1);

    const messageType2Parsed = ntlmParse(messageType2, { compact: true }) as NTLMType2;
    options.onMessageType2(rsn, messageType2Parsed, proxyCache, proxyId);

    res.setHeader('WWW-Authenticate', `NTLM ${messageType2}`).status(401).end();
    if (debugNtlmAuthFlow.enabled) {
      debugNtlmAuthFlow(`${Larrow} Return ${blue}401${reset} ${hnColor}WWW-Authenticate${blue}: ${hvOutColor}NTLM ${messageType2}`);
      debugNtlmAuthFlow(`Decoded MessageType2: ${hvOutColor}${JSON.stringify(messageType2Parsed, undefined, 2)}`);
    }
  } catch (err) {
    return options.handleHttpError500(res, err);
  }
};
