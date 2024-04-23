/* eslint-disable no-console */

const dotenv = require('dotenv');
const express = require('express');
const expressKerberos = require('express-kerberos');

dotenv.config();
process.env.DEBUG = 'ntlm:auth,ntlm:ldap-proxy,ntlm:proxy-id';

const app = express();
const port = Number(process.env.TEST_PORT) || 8080;

app.get('/', expressKerberos(), (req, res) => {
  res.send(`Hello ${req.auth.username}!`);
});

app.all('*', (req, res) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
