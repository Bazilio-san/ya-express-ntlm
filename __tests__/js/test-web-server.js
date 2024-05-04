/* eslint-disable no-console */

const dotenv = require('dotenv');
const express = require('express');
const fs = require('fs');
const path = require('path');

dotenv.config();
process.env.DEBUG = 'ntlm:auth-flow,ntlm:ldap-proxy,ntlm:ldap-proxy-id,ntlm:context';

const { authNTLM } = require('../../dist/cjs/src');

const app = express();
const port = Number(process.env.TEST_PORT) || 8080;

app.use((req, res, next) => {
  if (req.path !== '/' && !/^\/(\d\.css|favicon.ico)$/.test(req.path)) {
    res.status(404).end();
    return;
  }
  next();
});

app.use(authNTLM({
  getStrategy: () => 'NTLM',
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
  getAuthDelay: () => 2_000,
  getDomainControllers: () => {
    if (process.env.LDAP_ADDRESS) {
      return process.env.LDAP_ADDRESS.split(/, */);
    }
    return 'ldap://dc.mydomain.myorg.com';
  },
}));

const htmlPage = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

app.all('*', (req, res) => {
  const json = { ts: Date.now(), ...req.ntlm };
  if (req.path === '/') {
    const content = htmlPage.replace('{{json}}', JSON.stringify(json, undefined, 2));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(content);
    return;
  }
  res.end(JSON.stringify(json));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
