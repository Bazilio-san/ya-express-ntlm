import { NextFunction, Request, Response } from 'express';
import { ConnectionOptions } from 'node:tls';
import { NTLMProxy } from '../proxy/NTLMProxy';
import { NTLMProxyStub } from '../proxy/NTLMProxyStub';

export interface Iudw {
  username: string,
  domain: string,
  workstation: string
}

export type TProxy = NTLMProxy | NTLMProxyStub

/**
 Стратегии:

 NTLM - обычная 4-х шаговая аутентификация с запросами в LDAP.
 Возвращает имя пользователя и реальный признак авторизации в AD.
 Используется по умолчанию.

 NTLM_STUB - 3-х шаговая аутентификация без запросов в LDAP.
 Второй шаг - искусственно сформированный ответ LDAP (NTLM message Type 2).
 В ответе от браузера ожидается имя пользователя и домен.
 4-й шаг - проверка авторизации - заглушка, всегда возвращающая true.
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
