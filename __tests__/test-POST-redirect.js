/* eslint-disable no-console */

const dotenv = require('dotenv');
const express = require('express');

dotenv.config();
process.env.DEBUG = 'ntlm:auth,ntlm:ldap-proxy,ntlm:conn-id';

const app = express();
const port = 8080;
const redir = 'https://support-dev.finam.ru/plugins/servlet/desk/portal/2/create/15?service=SRV-103&subservice=SRV-112&chatId=1712601373738&cFields=summary:Тестирование%20Темы,description:Тестирование%20c%20пробелами%20Описания,customfield_10453:testValue1,customfield_10457:testValue2,customfield_10823:IT-155905,customfield_10460:да,customfield_10456:Постоянный';
app.all('*', (req, res) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
