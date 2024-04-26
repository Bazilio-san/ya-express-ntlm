/* eslint-disable no-console */

import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ntlmParse } from '../../src';

dotenv.config();
const host = process.env.DECODER_HOST || 'localhost';
const port = Number(process.env.DECODER_PORT) || 8081;

const app: express.Express = express();

app.use(express.json());

app.post('/decode', (req: Request, res: Response) => {
  let { message } = req.body;
  message = message.trim().replace(/(?:(?:Authorization|WWW-Authenticate): )?NTLM(?: |$)/, '');
  const parsedData = ntlmParse(message);
  res.setHeader('Content-Type', 'application/json').send(JSON.stringify(parsedData));
});

app.get('/', (req: Request, res: Response) => {
  let html = fs.readFileSync(path.join(process.cwd(), '__tests__/decoder/decode.html'), { encoding: 'utf8' });
  html = html.replace('{{host}}', host).replace('{{port}}', String(port));
  res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.all('*', (req: Request, res: Response) => {
  res.status(404).send('404 Not found');
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
