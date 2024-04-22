/* eslint-disable no-console */

const dotenv = require('dotenv');
const express = require('express');

dotenv.config();
process.env.DEBUG = 'ntlm:auth,ntlm:ldap-proxy,ntlm:conn-id';

const { authNTLM } = require('../dist/cjs/src/index.js');

const app = express();
const port = 8080;

app.use(authNTLM({
  getStrategy: () => 'NTLM_STUB',
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
}));

app.all('*', (req, res) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
