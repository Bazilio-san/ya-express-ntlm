import { Response } from 'express';
import { red } from 'af-color';
import { EAuthStrategy, IAuthNtlmOptions, IAuthNtlmOptionsMandatory, IRsn, IUserData } from './interfaces';
import { debugNtlmAuthFlow, debugNtlmLdapProxyId } from './express-ntlm/debug';
import { DELAY_BETWEEN_USER_AUTHENTICATE_CHALLENGES_MILLIS } from './express-ntlm/lib/constants';
import { NTLMType2 } from './ntlm-parser';
import { ProxyCache } from './express-ntlm/proxy/ProxyCache';

export const prepareOptions = (options?: IAuthNtlmOptions): IAuthNtlmOptionsMandatory => {
  const opt = (options || {}) as IAuthNtlmOptionsMandatory;

  // As proxyId we use the domain name obtained from challenge messages
  // or from the getDomain() function
  if (typeof opt.getProxyId !== 'function') {
    opt.getProxyId = (rsn: IRsn): string => {
      const proxyId = rsn.req.ntlm.domain || rsn.options.getDomain(rsn) || 'foo';
      debugNtlmLdapProxyId(`↑ ${proxyId}`);
      return proxyId;
    };
  }

  if (typeof opt.onMessageType2 !== 'function') {
    opt.onMessageType2 = (rsn: IRsn, messageType2Parsed: NTLMType2, _proxyCache: ProxyCache, _proxyId: string) => {
      if (messageType2Parsed.domain) {
        debugNtlmLdapProxyId(`↓ ${messageType2Parsed.domain}`);
        rsn.req.ntlm.domain = messageType2Parsed.domain;
      }
    };
  }

  if (typeof opt.getCachedUserData !== 'function') {
    opt.getCachedUserData = (rsn: IRsn): Partial<IUserData> => rsn.req.socket?.ntlm || {};
  }

  if (typeof opt.addCachedUserData !== 'function') {
    opt.addCachedUserData = (rsn: IRsn, userData: IUserData) => {
      rsn.req.socket.ntlm = userData;
    };
  }

  if (typeof opt.getStrategy !== 'function') {
    opt.getStrategy = () => EAuthStrategy.NTLM;
  }

  if (typeof opt.getTlsOptions !== 'function') {
    opt.getTlsOptions = () => undefined;
  }

  if (typeof opt.getDomainControllers !== 'function') {
    opt.getDomainControllers = () => ['ldap://alfa.com'];
  }

  if (typeof opt.getDomain !== 'function') {
    opt.getDomain = () => 'ALFA';
  }

  if (typeof opt.getAuthDelay !== 'function') {
    opt.getAuthDelay = () => DELAY_BETWEEN_USER_AUTHENTICATE_CHALLENGES_MILLIS;
  }

  if (typeof opt.handleHttpError400 !== 'function') {
    opt.handleHttpError400 = (res: Response, message?: any) => {
      const msg = message?.message || message || 'Bad request (during NTLM authentication)';
      debugNtlmAuthFlow(`${red}HTTP 400: ${message?.stack || msg}`);
      res.status(400).send(`HTTP 400: ${msg}`);
    };
  }

  if (typeof opt.handleHttpError403 !== 'function') {
    opt.handleHttpError403 = (rsn: IRsn) => {
      const { req, res } = rsn;
      const { username, domain, uri } = req.ntlm || {};
      const msg = `HTTP 403: User ${username} did not pass authorization in the "${domain}" domain / ${uri}`;
      debugNtlmAuthFlow(red + msg);
      res.status(403).send(msg);
    };
  }

  if (typeof opt.handleHttpError500 !== 'function') {
    opt.handleHttpError500 = (res: Response, message?: any) => {
      const msg = message?.message || message || 'Internal server error (during NTLM authentication)';
      debugNtlmAuthFlow(`${red}HTTP 500: ${message?.stack || msg}`);
      res.status(500).send(`HTTP 500: ${msg}`);
    };
  }

  if (typeof opt.handleSuccessAuthentication !== 'function') {
    opt.handleSuccessAuthentication = (rsn: IRsn) => {
      rsn.next();
    };
  }

  return opt;
};
