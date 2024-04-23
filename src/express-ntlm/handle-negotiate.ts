import { Buffer } from 'buffer';
import { blue, reset } from 'af-color';
import { IRsn } from '../interfaces';
import { proxyCache } from './proxy/proxy-cache';
import { debug, hnColor, hvOutColor } from './debug';
import { ntlmParse } from '../ntlm-parser';
import { Larrow } from './lib/constants';

export const handleNegotiate = async (rsn: IRsn, messageType1: Buffer) => {
  const { res, options } = rsn;
  try {
    rsn.payload = messageType1;
    const proxyId = options.getProxyId(rsn);
    const messageType2 = await proxyCache.addOrReplace(rsn, proxyId, messageType1);
    res.setHeader('WWW-Authenticate', `NTLM ${messageType2}`).status(401).end();
    if (debug.enabled) {
      debug(`${Larrow} Return ${blue}401${reset} ${hnColor}WWW-Authenticate${blue}: ${hvOutColor}NTLM ${messageType2}`);
      debug(`Decoded MessageType2: ${hvOutColor}${JSON.stringify(ntlmParse(messageType2, { compact: true }), undefined, 2)}`);
    }
  } catch (err) {
    return options.handleHttpError500(res, err);
  }
};
