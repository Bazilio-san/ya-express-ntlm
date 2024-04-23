import { Buffer } from 'buffer';
import { bg, bold, boldOff, lBlue, reset, yellow } from 'af-color';
import { EAuthStrategy, IRsn, IUserData } from '../interfaces';
import { isFlagSet, toBinary, transferExistingProps } from './lib/utils';
import { proxyCache } from './proxy/proxy-cache';
import { debug } from './debug';

const getFragmentOfNtlmMessageType3 = (buf: Buffer, offsetPos: number, lenPos: number, isUtf16le: boolean): string => {
  const offset = buf.readUInt32LE(offsetPos);
  const len = buf.readUInt16LE(lenPos);
  const fragmentBuf: Buffer = buf.subarray(offset, offset + len);
  return isUtf16le ? fragmentBuf.toString('utf16le') : fragmentBuf.toString();
};

const parseNtlmMessageType3 = (msg: Buffer): IUserData => {
  const isUtf16le = isFlagSet(msg.readUInt8(0x3C), toBinary('00000001'));
  return {
    domain: getFragmentOfNtlmMessageType3(msg, 0x20, 0x1C, isUtf16le),
    username: getFragmentOfNtlmMessageType3(msg, 0x28, 0x24, isUtf16le),
    workstation: getFragmentOfNtlmMessageType3(msg, 0x30, 0x2C, isUtf16le),
  };
};

export const handleAuthenticate = async (rsn: IRsn, messageType3: Buffer): Promise<boolean> => {
  const IS_ERROR = false;
  const IS_SUCCESS = true;
  const { req, res, options } = rsn;
  const { uri } = req.ntlm;
  const strategy = options.getStrategy(rsn);

  const udw = parseNtlmMessageType3(messageType3);
  if (!udw.domain) {
    debug(`${yellow}No domain extracted from NTLM message Type 3 ${reset}(for ${uri})`);
  }

  // req.ntlm may already have data, but MessageType3 may not have all of it.
  res.locals.ntlm = transferExistingProps(udw, req.ntlm);
  options.addCachedUserData(rsn, req.ntlm as IUserData);
  const userData = req.ntlm;
  const { domain } = userData;

  let result = IS_SUCCESS;

  if (strategy === EAuthStrategy.NTLM_STUB) {
    userData.isAuthenticated = true;
  } else {
    const proxyId = options.getProxyId({ ...rsn, payload: null });
    const proxy = proxyCache.getProxy(proxyId);
    if (!proxy) {
      options.handleHttpError500(res, `No LDAP proxy found in cache by id '${proxyId}' / domain '${domain}' (for ${uri})`);
      return IS_ERROR;
    }
    try {
      userData.isAuthenticated = await proxy.authenticate(messageType3);
    } catch (err) {
      options.handleHttpError500(res, err);
      result = IS_ERROR;
    }
  }

  debug(`User ${bold}${lBlue}${domain ? `${domain}/` : ''}${userData.username
  } ${userData.isAuthenticated ? bg.lGreen : `${bg.lYellow}NOT `}${
    bold}Authenticated${bg.def + boldOff}${reset} / Requested URI: ${uri}`);
  return result;
};
