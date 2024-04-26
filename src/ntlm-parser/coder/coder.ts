/* eslint-disable no-console */

import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ntlmParse } from '../index';
import { createMessageType1Buf } from '../../node-ntlm-core/createMessageType1';
import { createMessageType2 } from '../../node-ntlm-core/createMessageType2';
import { createMessageType3, parseType2Message } from '../../node-ntlm-core/createMessageType3';

export const startCoder = () => {
  dotenv.config();
  const host = process.env.DECODER_HOST || 'localhost';
  const port = Number(process.env.DECODER_PORT) || 8081;

  const app: express.Express = express();

  app.use(express.json());

  app.post('/create', (req: Request, res: Response) => {
    const { domain = '', workstation = '', username = '', password = '' } = req.body;
    const messageType1Buf = createMessageType1Buf({ domain, workstation });
    const messageType1 = `NTLM ${messageType1Buf.toString('base64')}`;
    const messageType2Buf = createMessageType2(messageType1Buf);
    const messageType2 = `NTLM ${messageType2Buf.toString('base64')}`;
    const messageType2BufAnother = parseType2Message(messageType2);
    const messageType3 = createMessageType3(messageType2BufAnother, { domain, workstation, username, password });
    res.setHeader('Content-Type', 'application/json').send(JSON.stringify({ messageType1, messageType2, messageType3 }));
  });

  app.post('/decode', (req: Request, res: Response) => {
    let { message } = req.body;
    message = message.trim().replace(/(?:(?:Authorization|WWW-Authenticate): )?NTLM(?: |$)/, '');
    const parsedData = ntlmParse(message);
    res.setHeader('Content-Type', 'application/json').send(JSON.stringify(parsedData));
  });

  app.get('/', (req: Request, res: Response) => {
    let html = fs.readFileSync(path.join(__dirname, 'coder.html').replace(/[\\/]dist[\\/](?:cjs|esm)/, ''), { encoding: 'utf8' });
    html = html.replace(/{{host}}/g, host).replace(/{{port}}/g, String(port));
    res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  });

  app.all('*', (req: Request, res: Response) => {
    res.status(404).send('404 Not found');
  });

  app.listen(port, () => {
    console.log(`Decoder web server listening on http://localhost:${port}`);
  });
};
