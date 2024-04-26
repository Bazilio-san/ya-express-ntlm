import { Buffer } from 'buffer';
import { blue, reset } from 'af-color';
import { IRsn } from '../interfaces';
import { proxyCache } from './proxy/proxy-cache';
import { debugNtlmAuthFlow, debugNtlmLdapProxyId, hnColor, hvOutColor } from './debug';
import { ntlmParse } from '../ntlm-parser';
import { Larrow } from './lib/constants';

export const handleNegotiate = async (rsn: IRsn, messageType1: Buffer) => {
  const { res, options } = rsn;
  try {
    rsn.payload = messageType1;
    const proxyId = options.getProxyId(rsn);
    const messageType2 = await proxyCache.addOrReplace(rsn, proxyId, messageType1);

    const parsedData = ntlmParse(messageType2, { compact: true });
    if (parsedData.domain) {
      debugNtlmLdapProxyId(`↓ ${parsedData.domain}`);
      rsn.req.ntlm.domain = parsedData.domain;
    }

    res.setHeader('WWW-Authenticate', `NTLM ${messageType2}`).status(401).end();
    if (debugNtlmAuthFlow.enabled) {
      debugNtlmAuthFlow(`${Larrow} Return ${blue}401${reset} ${hnColor}WWW-Authenticate${blue}: ${hvOutColor}NTLM ${messageType2}`);
      debugNtlmAuthFlow(`Decoded MessageType2: ${hvOutColor}${JSON.stringify(parsedData, undefined, 2)}`);
    }
  } catch (err) {
    return options.handleHttpError500(res, err);
  }
};
