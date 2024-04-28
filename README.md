[![NPM version](https://img.shields.io/npm/v/ya-express-ntlm.svg?style=flat)](https://www.npmjs.com/package/ya-express-ntlm)

# ya-express-ntlm

An **express** middleware to have basic **NTLM-authentication** in node.js.







The project [express-ntlm](https://www.npmjs.com/package/express-ntlm) was taken as a basis and rewritten in TypeScript.
- The logic for caching the connection to the LDAP server has been changed.
  The default connection ID is now the domain name.
- Added a delay after an unsuccessful authorization attempt on the LDAP server. 
  If the password is entered incorrectly, this prevents the user from being locked out.
  if the domain controller has a blocking policy set after, for example,
  3 failed authentication attempts within 1 minute.
- Added advanced logging in debug mode with decoded NTLM messages. Using code from the project
  [ntlm-parser](https://www.npmjs.com/package/ntlm-parser). 
- In "NTLM_STUB" mode the LDAP server is not used. And the NTLM message Type 2 
  is generated using code taken from the project [@node-ntlm/core](https://www.npmjs.com/package/@node-ntlm/core).


## install

```shell
npm install ya-express-ntlm
```



## Usage example



#### JS

```js
const dotenv = require('dotenv');

dotenv.config();
const express = require('express');
const { authNTLM } = require('ya-express-ntlm');

process.env.DEBUG = 'ntlm:auth-flow,ntlm:ldap-proxy,ntlm:ldap-proxy-id';

const app = express();
const port = Number(process.env.TEST_PORT) || 8080;

app.use(authNTLM({
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
  getDomainControllers: () => [process.env.LDAP_ADDRESS || 'ldap://dc.mydomain.myorg.com'],
}));

app.all('*', (req, res) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
```




#### TypeScript

```typescript
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';

dotenv.config();
process.env.DEBUG = 'ntlm:auth-flow,ntlm:ldap-proxy,ntlm:ldap-proxy-id';

import { authNTLM, EAuthStrategy } from 'ya-express-ntlm';

const app: express.Express = express();
const port = Number(process.env.TEST_PORT) || 8080;

app.use(authNTLM({
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
  getDomainControllers: () => [process.env.LDAP_ADDRESS || 'ldap://dc.mydomain.myorg.com'],
}));

app.all('*', (req: Request, res: Response) => {
  res.end(JSON.stringify({ ts: Date.now(), ...req.ntlm }));
  // {"domain": "MYDOMAIN", "username": "MYUSER", "workstation": "MYWORKSTATION"}
});

app.listen(port);

console.log(`Server listening on http://localhost:${port}`);
```

To use the `req.ntlm` object in your TypeScript project, add the file `express-augmented.d.ts`

```typescript
declare global {
  namespace Express {
    export interface Request {
      ntlm: {
        username?: string,
        domain?: string,
        workstation?: string,
        isAuthenticated?: boolean,
        uri?: string,
      },
    }
  }
}
```



## Without validation

It's not recommended, but it's possible to add NTLM-Authentication without 
validation. This means you can authenticate without providing valid credentials.

```js
app.use(authNTLM({
  getStrategy: () => 'NTLM_STUB',
  getDomain: () => process.env.DOMAIN || 'MYDOMAIN',
}));
```



## Options

All parameters are optional functions [listed here](https://github.com/Bazilio-san/ya-express-ntlm/blob/master/src/interfaces.ts#L42)     


Default values are [here](https://github.com/Bazilio-san/ya-express-ntlm/blob/master/src/prepare-options.ts#L9).




## Notes

All NTLM-fields (`username`, `domain`, `workstation`) are also available within
`response.locals.ntlm`, which means you can access it through your template
engine (e.g. jade or ejs) while rendering (e.g. `<%= ntlm.username %>`).




## Debugging

You can view the entire authorization process in detail.
To enable debug mode, you need to set ENV `DEBUG`

```shell
DEBUG=ntlm:auth-flow,ntlm:ldap-proxy,ntlm:ldap-proxy-id
```

<img src="debug.png" alt="debug" />



**Typical NTLM handshake looks like this**

<img src="img/NTLM-Authorisation.png" alt="NTLM-Authorisation" />


## Create / Decode NTLM messages

To experiment with NTLM messages:

```typescript
import { startCoder } from 'ya-express-ntlm';

startCoder();
```

<img src="img/create-ntlm-message.png" alt="Create NTLM message" />

<img src="img/decode-ntlm-message.png" alt="Decode NTLM message" />



## References

NTLM specification:  
https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-nlmp/b38c36ed-2804-4868-a9ff-8dd3182128e4

A more understandable document describing NTLM:  
http://davenport.sourceforge.net/ntlm.html

NTLM Authentication Scheme for HTTP:  
https://web.archive.org/web/20200724074947/https://www.innovation.ch/personal/ronald/ntlm.html

