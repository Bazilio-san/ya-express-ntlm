import { NextFunction, Request, Response } from 'express';
import { ConnectionOptions } from 'node:tls';
import { NTLMProxy } from './express-ntlm/proxy/NTLMProxy';
import { NTLMProxyStub } from './express-ntlm/proxy/NTLMProxyStub';

export interface Iudw {
  username: string,
  domain: string,
  workstation: string
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
   * Returns one of two values: NTLM | NTLM_STUB
   */
  getStrategy: (rsn: IRsn) => EAuthStrategy,

  /**
   * Returns default domain if the DomainName-field cannot be parsed.
   * Ex: 'MYDOMAIN'
   */
  getDomain: (rsn: IRsn) => string | undefined,

  /**
   * Returns array of domain controllers to handle the authentication.
   * Active Directory is supported.
   * Ex: ['ldap://myad.example']
   */
  getDomainControllers: (rsn: IRsn) => string[],

  /**
   * Function to handle HTTP 400 Bad Request.
   */
  handleHttpError400: (res: Response, message?: any) => void,

  /**
   * Function to handle HTTP 403 Forbidden.
   */
  handleHttpError403: (res: Response, udw: Iudw, message?: any) => void,

  /**
   * Function to handle HTTP 500 Internal Server Error.
   */
  handleHttpError500: (res: Response, message?: any) => void,

  /**
   * Function to handle Success Authorisation.
   */
  handleSuccessAuthorisation: (rsn: IRsn) => void,

  /**
   * Function to generate custom connection IDs, based optionally on the request
   * and response objects.
   */
  getConnectionId: (rsn: IRsn) => string,

  /**
   * Returns an options object that will be passed to tls.connect and
   * tls.createSecureContext. Only required when using ldaps and the server's
   * certificate is signed by a certificate authority not in Node's default
   * list of CAs. (or use NODE_EXTRA_CA_CERTS environment variable)
   */
  getTlsOptions: (rsn: IRsn) => ConnectionOptions | undefined,
}

export type IAuthNtlmOptions = Partial<IAuthNtlmOptionsMandatory>;
