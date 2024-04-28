import { NextFunction, Request, Response } from 'express';
import { ConnectionOptions } from 'node:tls';
import { NTLMProxy } from './express-ntlm/proxy/NTLMProxy';
import { NTLMProxyStub } from './express-ntlm/proxy/NTLMProxyStub';
import { ProxyCache } from './express-ntlm/proxy/ProxyCache';
import { NTLMType2 } from './ntlm-parser';

export interface IUserData {
  username: string,
  domain: string,
  workstation: string
  isAuthenticated?: boolean,
}

export type TProxy = NTLMProxy | NTLMProxyStub

export interface IRsn {
  req: Request,
  res: Response,
  next: NextFunction,
  options: IAuthNtlmOptionsMandatory,
  payload?: any
}

/**
 Strategy

 NTLM - regular 4-step authentication with LDAP queries.
 Returns the username and real sign of authorization in AD.
 Used by default.

 NTLM_STUB - 3-step authentication without queries in LDAP.
 The second step is an artificially generated LDAP response (NTLM message Type 2).
 The response from the browser expects the username and domain.
 4th step - authorization check - a stub that always returns true.
 */
export enum EAuthStrategy {
  NTLM = 'NTLM',
  NTLM_STUB = 'NTLM_STUB',
}

export interface IAuthNtlmOptionsMandatory {
  /**
   * Function to generate custom proxy cache ID.
   */
  getProxyId: (rsn: IRsn) => string,

  /**
   * By default, this function fills req.ntlm.domain with messageType2
   * and replaces proxyId with the new domain name // VVQ
   */
  onMessageType2: (rsn: IRsn, messageType2: NTLMType2, proxyCache: ProxyCache, proxyId: string) => void,

  /**
   * Function to return the cached NTLM user data.
   */
  getCachedUserData: (rsn: IRsn) => Partial<IUserData>,

  /**
   * Function to cache the NTLM user data.
   */
  addCachedUserData: (rsn: IRsn, userData: IUserData) => void,

  /**
   * Returns one of two values: NTLM | NTLM_STUB
   */
  getStrategy: (rsn: IRsn) => EAuthStrategy,

  /**
   * Returns default domain if the DomainName-field cannot be parsed.
   * Ex: 'MYDOMAIN'
   */
  getDomain: (rsn: IRsn) => string | undefined,

  /**
   * Minimum time between failed authentication and next attempt.
   */
  getAuthDelay: (rsn: IRsn) => number,

  /**
   * Returns array of domain controllers to handle the authentication.
   * Active Directory is supported.
   * Ex: ['ldap://dc.mydomain.myorg.com']
   */
  getDomainControllers: (rsn: IRsn) => string[],

  /**
   * Function to handle HTTP 400 Bad Request.
   */
  handleHttpError400: (res: Response, message?: any) => void,

  /**
   * Function to handle HTTP 403 Forbidden.
   */
  handleHttpError403: (rsn: IRsn) => void,

  /**
   * Function to handle HTTP 500 Internal Server Error.
   */
  handleHttpError500: (res: Response, message?: any) => void,

  /**
   * Function to handle Success Authorisation.
   */
  handleSuccessAuthorisation: (rsn: IRsn) => void,

  /**
   * Returns an options object that will be passed to tls.connect and
   * tls.createSecureContext. Only required when using ldaps and the server's
   * certificate is signed by a certificate authority not in Node's default
   * list of CAs. (or use NODE_EXTRA_CA_CERTS environment variable)
   */
  getTlsOptions: (rsn: IRsn) => ConnectionOptions | undefined,
}

export type IAuthNtlmOptions = Partial<IAuthNtlmOptionsMandatory>;
