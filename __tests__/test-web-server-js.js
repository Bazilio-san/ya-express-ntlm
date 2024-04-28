/* eslint-disable no-console */

const dotenv = require('dotenv');
const express = require('express');

dotenv.config();
process.env.DEBUG = 'ntlm:auth-flow,ntlm:ldap-proxy,ntlm:ldap-proxy-id';

const { authNTLM } = require('../dist/cjs/src/index.js');

const app = express();
const port = Number(process.env.TEST_PORT) || 8080;

app.use(authNTLM({
  getStrategy: () => 'NTLM',
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
  getDomainControllers: () => {
    if (process.env.LDAP_ADDRESS) {
      return process.env.LDAP_ADDRESS.split(/, */);
    }
    return 'ldap://dc.mydomain.myorg.com';
  },
}));

app.all('*', (req, res) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
