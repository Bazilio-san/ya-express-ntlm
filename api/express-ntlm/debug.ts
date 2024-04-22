/* eslint-disable no-console */
import { Debug } from 'af-tools-ts';
import { green, bold, reset, magenta, cyan, yellow } from 'af-color';

export const debug = Debug('ntlm:auth', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + green,
  messageColor: reset,
});

export const hnColor = green;
export const hvInColor = magenta;
export const hvOutColor = cyan;

export const debugProxy = Debug('ntlm:ldap-proxy', {
  noTime: true,
  noPrefix: false,
  prefixColor: bold + yellow,
  messageColor: reset,
});
