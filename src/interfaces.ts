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
  getTlsOptions: (rsn: IRsn) => ConnectionOptions | undefined,
  getStrategy: (rsn: IRsn) => EAuthStrategy,
  getConnectionId: (rsn: IRsn) => string,
  getControllers: (rsn: IRsn) => string[],
  getDomain: (rsn: IRsn) => string | undefined,
  handleHttpError400: (res: Response, message?: any) => void,
  handleHttpError403: (res: Response, udw: Iudw, message?: any) => void,
  handleHttpError500: (res: Response, message?: any) => void,
}

export type IAuthNtlmOptions = Partial<IAuthNtlmOptionsMandatory>;

export interface IRsn {
  req: Request,
  res: Response,
  next: NextFunction,
  options: IAuthNtlmOptionsMandatory,
  payload?: any
}
