/* eslint-disable no-console */
import { Debug } from 'af-tools-ts';
import { green, bold, reset, magenta, cyan, yellow, red } from 'af-color';

export const debugNtlmAuthFlow = Debug('ntlm:auth-flow', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + green,
  messageColor: reset,
});

export const hnColor = green;
export const hvInColor = magenta;
export const hvOutColor = cyan;

export const debugNtlmLdapProxy = Debug('ntlm:ldap-proxy', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + yellow,
  messageColor: reset,
});

export const debugNtlmLdapProxyId = Debug('ntlm:ldap-proxy-id', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + cyan,
  messageColor: reset,
});

export const debugNtlmContext = Debug('ntlm:context', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + red,
  messageColor: reset,
});
