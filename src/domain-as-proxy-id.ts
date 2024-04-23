import { reset, yellow } from 'af-color';
import { IRsn } from './interfaces';
import { debugProxyId } from './express-ntlm/debug';
import { UUIDv4 } from './express-ntlm/lib/utils';
import { getSuppliedDomainData } from './node-ntlm-core/createMessageType1';

export const getProxyId = (rsn: IRsn) => {
  const { req, options } = rsn;
  let id: string | undefined;

  const ret = (from: string, isSaveAsDomain?: boolean) => {
    debugProxyId(`from '${from}': ${yellow}${id}`);
    if (isSaveAsDomain) {
      req.ntlm.domain = id;
    }
    req.socket.id = id as string;
    return id;
  };

  // 1) req.socket.id
  ({ id } = req.socket);
  if (id) {
    return ret('req.socket.id');
  }

  // 2) messageType1
  const messageType1 = rsn.payload as Buffer;
  if (messageType1) {
    id = getSuppliedDomainData(messageType1);
    if (id) {
      return ret('messageType1', true);
    }
    debugProxyId(`${yellow}No domain extracted from NTLM message Type 1 (used ad id for Proxy Cache) ${reset}(for ${req.ntlm.uri})`);
  }

  // 3) ntlm.domain
  id = req.ntlm.domain;
  if (id) {
    return ret('req.ntlm.domain');
  }

  // 4) getDomain By Host
  id = options.getDomain(rsn);
  if (id) {
    return ret('getDomain()', true);
  }

  // 5) UUIDv4
  id = UUIDv4();
  return ret('UUIDv4()');
};
