import { Buffer } from 'buffer';
import { CookieOptions, Request, Response } from 'express';
import { IRsn } from '../types/interfaces';

export const concatBuffer = (...args: Buffer[]): Buffer => {
  const buffersArray = Array.prototype.slice.call(args, 0);
  let totalLength = 0;
  let i: number;
  let offset = 0;

  for (i = 0; i < buffersArray.length; i++) {
    totalLength += buffersArray[i].length;
  }

  const finalBuf = Buffer.alloc(totalLength);

  for (i = 0; i < buffersArray.length; i++) {
    buffersArray[i].copy(finalBuf, offset);
    offset += buffersArray[i].length;
  }

  return finalBuf;
};

export const toBinary = (int: string): number => parseInt(int, 2);

export const isFlagSet = (field: number, flag: number): boolean => (field & flag) === flag;

export const UUIDv4 = (): string => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const PROXY_ID_COOKIE_NAME = 'YA_NTLM_PROXY_ID';
const DOMAIN_COOKIE_NAME = 'YA_NTLM_DOMAIN';
const COOKIE_EXPIRE_MILLIS = 20 * 60_000; // would expire after 60 sec

export const setCookie = (res: Response, name: string, value: string): string => {
  const cookieOptions: CookieOptions = { expires: new Date(Date.now() + COOKIE_EXPIRE_MILLIS) };
  res.cookie(name, value, cookieOptions);
  return value;
};

export const setProxyIdCookie = (res: Response, value: string): string => setCookie(res, PROXY_ID_COOKIE_NAME, value);
export const setDomainCookie = (rsn: IRsn, value?: string): string | undefined => {
  if (value) {
    rsn.req.ntlm.domain = value;
    return setCookie(rsn.res, DOMAIN_COOKIE_NAME, value);
  }
};

export const getProxyIdCookie = (req: Request): string | undefined => req?.cookies?.[PROXY_ID_COOKIE_NAME];
export const getDomainCookie = (req: Request): string | undefined => {
  const domain = req?.cookies?.[DOMAIN_COOKIE_NAME];
  if (domain) {
    req.ntlm.domain = domain;
  }
  return domain;
};

export const sanitizeText = (msg?: Buffer) => (msg || '')
  .toString('utf-8')
  .replace(/\s+/sg, ' ')
  .replace(/[^\w. -]/g, '♦')
  .replace(/([\w.-])♦([\w.-])/g, '$1$2')
  .replace(/([\w.-])♦([\w.-])/g, '$1$2')
  .replace(/[♦\s]{2,}/sg, ' ');
