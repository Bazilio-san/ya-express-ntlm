import { blue, lBlue, reset, rs, yellow } from 'af-color';
import { Buffer } from 'buffer';
import { IRsn, TProxy } from '../../interfaces';
import { debugNtlmLdapProxy } from '../debug';
import { NTLMProxyStub } from './NTLMProxyStub';
import { NTLMProxy } from './NTLMProxy';

interface ICachedProxy {
  proxy: TProxy,
  expire: number,
}

export interface IAddProxyResult {
  proxy: TProxy,
  messageType2Buf: Buffer,
  isNewProxy?: boolean
}

const PROXY_LIVE_TIME_MILLIS = 60_000;

const cache: {
  [id: string]: ICachedProxy
} = {};

const connectToProxy = async (rsn: IRsn, id: string, messageType1: Buffer): Promise<IAddProxyResult> => {
  const strategy = rsn.options.getStrategy(rsn);

  if (strategy === 'NTLM_STUB') {
    const proxy = new NTLMProxyStub(id);
    const messageType2Buf = await proxy.negotiate(messageType1);
    return { proxy, messageType2Buf };
  }

  let proxy = proxyCache.getProxy<NTLMProxy>(id);

  const tryProxy = async (isNewProxy?: boolean) => {
    if (proxy) {
      try {
        const messageType2Buf = await proxy.negotiate(messageType1);
        if (messageType2Buf) {
          return { proxy, messageType2Buf, isNewProxy };
        }
      } catch (err) {
        proxy.close();
      }
    }
  };
  let result: IAddProxyResult | undefined = await tryProxy();
  if (result) {
    return result;
  }
  const tlsOptions = rsn.options.getTlsOptions(rsn);
  const controllers = rsn.options.getDomainControllers(rsn);
  for (let i = 0; i < controllers.length; i++) {
    const ldapServer = new URL(controllers[i]);
    const decodedPath = decodeURI(ldapServer.pathname || '');
    debugNtlmLdapProxy(`Choose LDAP server ${blue}${ldapServer.host}${reset}${
      decodedPath ? ` using base DN "${decodedPath}"` : ''}`);
    proxy = new NTLMProxy({
      id,
      host: ldapServer.hostname,
      port: ldapServer.port,
      tlsOptions,
    });
    result = await tryProxy(true);
    if (result) {
      return result;
    }
  }
  throw new Error(`None of the Domain Controllers are available: ${JSON.stringify(controllers)}`);
};

export class ProxyCache {
  clean () {
    Object.entries(cache).forEach(([id, cachedProxy]) => {
      if (cachedProxy.expire < Date.now()) {
        this.remove(id, true);
      }
    });
    proxyCache.info('clean');
  }

  remove (id: string, byTimeout?: boolean) {
    const cachedProxy: ICachedProxy = cache[id];
    if (cachedProxy) {
      const { proxy } = cachedProxy;
      proxy.close();
      delete cache[id];
      debugNtlmLdapProxy(`Deleted proxy from cache${byTimeout ? ' by timeout' : ''
      }: id: ${lBlue}${id}${rs} / ${proxy.coloredAddress}`);
    }
  }

  async addOrReplace (rsn: IRsn, id: string, messageType1: Buffer): Promise<string> {
    const { proxy, messageType2Buf, isNewProxy } = await connectToProxy(rsn, id, messageType1);
    debugNtlmLdapProxy(`${isNewProxy ? 'Inserted proxy to' : 'Used proxy from'} cache: id: ${yellow}${id}${rs} / ${proxy.coloredAddress}`);
    cache[id] = { proxy, expire: Date.now() + PROXY_LIVE_TIME_MILLIS };
    return messageType2Buf.toString('base64');
  }

  getProxy<T = TProxy> (id: string): T | undefined {
    return cache[id]?.proxy as T | undefined;
  }

  changeId (oldId: string, newId: string) {
    const cachedProxy: ICachedProxy = cache[oldId];
    if (cachedProxy) {
      cache[newId] = cachedProxy;
      cachedProxy.proxy.id = newId;
    }
  }

  info (from = '') {
    const { length } = Object.keys(cache);
    if (length) {
      debugNtlmLdapProxy(`[${from}] In cache ${Object.keys(cache).length} LDAP proxy connections`);
    }
  }
}

export const proxyCache = new ProxyCache();

setInterval(() => {
  proxyCache.clean();
}, 30_000);
