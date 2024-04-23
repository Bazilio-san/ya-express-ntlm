import { Response } from 'express';
import { red, reset, yellow } from 'af-color';
import { EAuthStrategy, IAuthNtlmOptions, IAuthNtlmOptionsMandatory, IRsn, Iudw } from './interfaces';
import { debug, debugConnId } from './express-ntlm/debug';
import { getProxyIdCookie, setProxyIdCookie, UUIDv4 } from './express-ntlm/lib/utils';
import { getSuppliedDomainData } from './node-ntlm-core/createMessageType1';

export const prepareOptions = (opt?: IAuthNtlmOptions): IAuthNtlmOptionsMandatory => {
  opt = opt || {};

  if (typeof opt.getConnectionId !== 'function') {
    const getId = (rsn: IRsn) => {
      const { req, options } = rsn;
      let id: string | undefined;
      const debugFrom = (from: string) => debugConnId(`from '${from}': ${yellow}${id}`);
      // 1) messageType1
      const messageType1 = rsn.payload as Buffer;
      if (messageType1) {
        id = getSuppliedDomainData(messageType1);
        if (id) {
          req.ntlm.domain = id;
          debugFrom('messageType1');
          return id;
        }
        debugConnId(`${yellow}No domain extracted from NTLM message Type 1 (used ad id for Proxy Cache) ${reset}(for ${req.ntlm.uri})`);
      }
      // 2) req.socket.id
      ({ id } = req.socket);
      if (id) {
        debugFrom('req.socket.id');
        return id;
      }
      // 3) Cookie
      id = getProxyIdCookie(req);
      if (id) {
        debugFrom('Cookie');
        return id;
      }
      // 4) ntlm.domain
      id = req.ntlm.domain;
      if (id) {
        debugFrom('req.ntlm.domain');
        return id;
      }
      // 5) getDomain By Host
      id = options.getDomain(rsn);
      if (id) {
        debugFrom('getDomain()');
        req.ntlm.domain = id;
        return id;
      }
      // 6) UUIDv4
      id = UUIDv4();
      debugFrom('UUIDv4()');
      return id;
    };

    opt.getConnectionId = (rsn: IRsn): string => {
      const id = getId(rsn);
      rsn.req.socket.id = id;
      return setProxyIdCookie(rsn.res, id);
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

  if (typeof opt.handleHttpError400 !== 'function') {
    opt.handleHttpError400 = (res: Response, message?: any) => {
      const msg = message?.message || message || 'Bad request (during NTLM authentication)';
      debug(`${red}HTTP 400: ${message?.stack || msg}`);
      res.status(400).send(`HTTP 400: ${msg}`);
    };
  }

  if (typeof opt.handleHttpError403 !== 'function') {
    opt.handleHttpError403 = (res: Response, udw: Iudw) => {
      const msg = `HTTP 403: User ${udw.username} did not pass authorization in the "${udw.domain}" domain / ${res.locals.ntlm.uri}`;
      debug(red + msg);
      res.status(403).send(msg);
    };
  }

  if (typeof opt.handleHttpError500 !== 'function') {
    opt.handleHttpError500 = (res: Response, message?: any) => {
      const msg = message?.message || message || 'Internal server error (during NTLM authentication)';
      debug(`${red}HTTP 500: ${message?.stack || msg}`);
      res.status(500).send(`HTTP 500: ${msg}`);
    };
  }

  if (typeof opt.handleSuccessAuthorisation !== 'function') {
    opt.handleSuccessAuthorisation = (rsn: IRsn) => {
      rsn.next();
    };
  }

  return opt as IAuthNtlmOptionsMandatory;
};
