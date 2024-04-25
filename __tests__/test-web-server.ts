/* eslint-disable no-console */

import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';

dotenv.config();
process.env.DEBUG = 'ntlm:auth-flow,ntlm:ldap-proxy,ntlm:ldap-proxy-id';

import { authNTLM, EAuthStrategy } from '../src';

const app: express.Express = express();
const port = Number(process.env.TEST_PORT) || 8080;

app.use(authNTLM({
  getStrategy: () => EAuthStrategy.NTLM,
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
  getDomainControllers: () => [process.env.LDAP_ADDRESS || 'ldap://dc.mydomain.myorg.com'],
}));

app.all('*', (req: Request, res: Response) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
