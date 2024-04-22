import { Buffer } from 'buffer';
import { blue, reset } from 'af-color';
import { IRsn } from './types/interfaces';
import { proxyCache } from './proxy/proxy-cache';
import { debug, hnColor, hvOutColor } from './debug';
import { ntlmParse } from '../ntlm-parser';
import { Larrow } from './lib/constants';
import { setDomainCookie } from './lib/utils';

export const handleNegotiate = async (rsn: IRsn, messageType1: Buffer) => {
  const { res, options } = rsn;
  try {
    rsn.payload = messageType1;
    const connectionId = options.getConnectionId(rsn);
    const messageType2 = await proxyCache.add(rsn, connectionId, messageType1);
    const parsedData = ntlmParse(messageType2, { compact: true });
    if (parsedData.domain) {
      setDomainCookie(rsn, parsedData.domain);
    }
    res.setHeader('WWW-Authenticate', `NTLM ${messageType2}`).status(401).end();
    if (debug.enabled) {
      debug(`${Larrow} Return ${blue}401${reset} ${hnColor}WWW-Authenticate${blue}: ${hvOutColor}NTLM ${messageType2}`);
      debug(`Decoded MessageType2: ${hvOutColor}${JSON.stringify(parsedData, undefined, 2)}`);
    }
  } catch (err) {
    return options.handleHttpError500(res, err);
  }
};
