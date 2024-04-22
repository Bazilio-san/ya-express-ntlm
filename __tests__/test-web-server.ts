/* eslint-disable no-console */
import express, { Request, Response } from 'express';
import { ntlm, EAuthStrategy } from '../src';

const app: express.Express = express();
const port = 8080;

app.use(ntlm({
  getStrategy: () => EAuthStrategy.NTLM,
  getDomain: () => 'MYDOMAIN',
  getControllers: () => ['ldap://myad.example'],
}));

app.all('*', (req: Request, res: Response) => {
  res.end(JSON.stringify(req.ntlm));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});
app.listen(port);

console.log(`Server listening on http://loclahost:${port}`);
