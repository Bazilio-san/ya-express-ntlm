import { Request, Response, NextFunction, RequestHandler } from 'express';
import { bg, black, blue, bold, boldOff, reset, rs } from 'af-color';
import { Buffer } from 'buffer';
import { IAuthNtlmOptions, IRsn, Iudw } from '../interfaces';
import { handleAuthenticate } from './handle-authenticate';
import { handleNegotiate } from './handle-negotiate';
import { debug, hnColor, hvInColor, hvOutColor } from './debug';
import { NTLMMessageParsed, NTLMMessageType, ntlmParse, NTLMType1, NTLMType2, NTLMType3 } from '../ntlm-parser';
import { prepareOptions } from '../prepare-options';
import { arrowR, Larrow } from './lib/constants';
import { setDomainCookie } from './lib/utils';

/**
 * Returns data from the Authorization header: NTLM <data>
 * If they can be parsed, then req.ntlm is filled
 */
const getNtlmAuthorizationData = (req: Request): string | undefined => {
  const [title, data] = req.headers?.authorization?.split(' ') || [];
  if (title === 'NTLM' && data) {
    return data;
  }
};

/**
 * Fills req.ntlm with data from the Authorization header: NTLM <data>
 * If they can be parsed.
 */
const fillReqNtlm = (req: Request, data: string): NTLMMessageParsed => {
  const parsedData = ntlmParse(data, { compact: true }) as NTLMType1 | NTLMType2 | NTLMType3;
  debug(`Decoded Authorization header: ${hvInColor}${JSON.stringify(parsedData, undefined, 2)}`);
  ['domain', 'username', 'workstation'].forEach((p) => {
    if (parsedData[p]) {
      req.ntlm[p] = parsedData[p];
    }
  });
  return parsedData;
};

export const authNTLM = (authNtlmOptions?: IAuthNtlmOptions): RequestHandler => {
  const options = prepareOptions(authNtlmOptions);
  return async (req: Request, res: Response, next: NextFunction) => {
    const uri = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const requestedURI = `${arrowR} ${req.method}: ${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const authorizationHeader = req.headers.authorization;
    const uriA = `${requestedURI} : ${authorizationHeader ? `${hnColor}Authorization: ${hvInColor}${
      authorizationHeader || ''}` : `${hnColor}No Authorization header`}`;
    const rsn: IRsn = { req, res, next, options };

    req.ntlm = req.ntlm || { uri };
    res.locals.ntlm = req.ntlm;
    const { ntlm } = req;

    const mTitle = `============ Start NTLM Authorization. Strategy: '${options.getStrategy(rsn)}' ==================`;

    // req.ntlm.isAuthenticated must be filled in earlier when determining the presence of a session cookie
    if (ntlm.isAuthenticated) {
      if (!authorizationHeader || (authorizationHeader && req.method !== 'POST')) {
        debug(`${requestedURI}\nConnection already authenticated${
          ntlm.username ? ` for user: ${ntlm.domain ? `${ntlm.domain}/` : ''}${ntlm.username}` : ''}`);
        return next();
      }
      debug(`The connection is authenticated, but the "Authorization" header sent using the POST method was detected`);
    }

    debug(uriA);
    if (!authorizationHeader) {
      debug(mTitle);
      debug(`${Larrow} Return ${blue}401${reset}: ${hnColor}WWW-Authenticate${blue}: ${hvOutColor}NTLM`);
      return res.setHeader('WWW-Authenticate', 'NTLM').status(401).end();
    }

    // Returns data from the Authorization header: NTLM <data>
    const ntlmAuthData = getNtlmAuthorizationData(req);

    if (!ntlmAuthData) {
      return options.handleHttpError400(res, `Authorization header does not contain NTLM data. URI ${uri}`);
    }
    // Fills req.ntlm with data from the Authorization header: NTLM <data>.
    const { domain, messageType } = fillReqNtlm(req, ntlmAuthData);
    // Domain names from NTLM messages - we believe
    if (domain) {
      setDomainCookie(rsn, domain);
    }

    const dataBuf = Buffer.from(ntlmAuthData, 'base64');
    if (messageType === NTLMMessageType.UNKNOWN) {
      return options.handleHttpError400(res, `Incorrect NTLM message Type ${dataBuf.readUInt8(8)}`);
    }

    if (messageType === NTLMMessageType.NEGOTIATE_MESSAGE) {
      return handleNegotiate(rsn, dataBuf).then(() => 0);
    }

    if (messageType === NTLMMessageType.AUTHENTICATE_MESSAGE) {
      if (!await handleAuthenticate(rsn, dataBuf)) {
        return; // In this case the error has already been sent over HTTP
      }
      if (!ntlm.isAuthenticated) {
        return options.handleHttpError403(res, ntlm as Iudw);
      }
      if (debug.enabled) {
        // eslint-disable-next-line no-console
        console.log(`\n${bg.lGreen + black}req.ntlm:${bg.def + rs}`, ntlm, `\n`);
      }
      debug(`${Larrow} Return ${bold + black}next${blue}()${boldOff}`);
      return next();
    }

    return options.handleHttpError400(res, 'NTLM: Unexpected Type 2 message (CHALLENGE) in client request');
  };
};
