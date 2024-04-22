[![NPM version](https://img.shields.io/npm/v/ya-express-ntlm.svg?style=flat)](https://www.npmjs.com/package/ya-express-ntlm)

# ya-express-ntlm

An express middleware to have basic NTLM-authentication in node.js.


Based on 
- [express-ntlm](https://www.npmjs.com/package/express-ntlm)
- [@node-ntlm/core](https://www.npmjs.com/package/@node-ntlm/core)
- [ntlm-parser](https://www.npmjs.com/package/ntlm-parser)

## install

    $ npm install ya-express-ntlm

## example usage

    var express = require('express'),
        ntlm = require('ya-express-ntlm');

    var app = express();

    app.use(ntlm({
        debug: function() {
            var args = Array.prototype.slice.apply(arguments);
            console.log.apply(null, args);
        },
        domain: 'MYDOMAIN',
        domaincontroller: 'ldap://myad.example',

        // use different port (default: 389)
        // domaincontroller: 'ldap://myad.example:3899',
    }));

    app.all('*', function(request, response) {
        response.end(JSON.stringify(request.ntlm)); // {"DomainName":"MYDOMAIN","UserName":"MYUSER","Workstation":"MYWORKSTATION"}
    });

    app.listen(80);


## example with ldaps

    var express = require('express'),
        ntlm = require('ya-express-ntlm'),
        fs = require('fs');

    var app = express();

    app.use(ntlm({
        debug: function() {
            var args = Array.prototype.slice.apply(arguments);
            console.log.apply(null, args);
        },
        domain: 'MYDOMAIN',
        domaincontroller: 'ldaps://myad.example',
        tlsOptions: {
            //trusted certificate authorities (can be extracted from the server with openssh)
            ca: fs.readFileSync('./ca.pem'),
            //tells the tls module not to check the server's certificate (do not use in production)
            //rejectUnauthorized: false,
        }
    }));

    //same as above
    app.all('*', function(request, response) {
        response.end(JSON.stringify(request.ntlm)); // {"DomainName":"MYDOMAIN","UserName":"MYUSER","Workstation":"MYWORKSTATION"}
    });

    app.listen(80);

### without validation

It's not recommended, but it's possible to add NTLM-Authentication without validation. This means you can authenticate without providing valid credentials.

    app.use(ntlm());

## options

| Name | type | default | description |
|------|------|---------|-------------|
| `badrequest` | `function` | `function(request, response, next) { response.sendStatus(400); }` | Function to handle HTTP 400 Bad Request. |
| `internalservererror` | `function` | `function(request, response, next) { response.sendStatus(500); }` | Function to handle HTTP 500 Internal Server Error. |
| `forbidden` | `function` | `function(request, response, next) { response.sendStatus(403); }` | Function to handle HTTP 403 Forbidden. |
| `unauthorized` | `function` | `function(request, response, next) { response.statusCode = 401; response.setHeader('WWW-Authenticate', 'NTLM'); response.end();  }` | Function to handle HTTP 401 Unauthorized. |
| `prefix` | `string` | `[ya-express-ntlm]` | The prefix is the first argument passed to the `debug`-function. |
| `debug` | `function` | `function() {}` | Function to log the debug messages. See [logging](#logging) for more details. |
| `domain` | `string` | `undefined` | Default domain if the DomainName-field cannot be parsed. |
| `domaincontroller` | `null` / `string` / `array` | `null` | One or more domaincontroller(s) to handle the authentication. If `null` is specified the user is not validated. Active Directory is supported. |
| `tlsOptions` | `object` | `undefined` | An options object that will be passed to [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) and [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options). __Only required when using ldaps and the server's certificate is signed by a certificate authority not in Node's default list of CAs.__ (or use [NODE_EXTRA_CA_CERTS](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file) environment variable)|
| `tlsOptions.ca` | `string` /  `array` / `Buffer` | `undefined` | Override the trusted CA certificates provided by Node. Refer to [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) |
| `getConnectionId` | `function` | `function(request, response) { return utils.uuidv4(); }` | Function to generate custom connection IDs, based optionally on the request and response objects. Used by the default implementation of `getProxyId` to keep backwards compatibility. *deprecated* |
| `getProxyId` | `function` | `function(request, response) { if (!request.connection.id) { request.connection.id = options.getConnectionId(request, response); } return request.connection.id; }` | Function to generate custom proxy cache IDs, based optionally on the request and response objects. |
| `getCachedUserData` | `function` | `function(request, response) { return request.connection.ntlm; }` | Function to return the cached NTLM user data. |
| `addCachedUserData` | `function` | `function(request, response, userData) { request.connection.ntlm = userData; }` | Function to cache the NTLM user data. |

## logging (examples)
<a name="logging" />

### simple debugging to the console

    function() {
        var args = Array.prototype.slice.apply(arguments);
        console.log.apply(null, args);
    }

### logging to [debug](https://github.com/visionmedia/debug) (or similiar logging-utilities)

    function() {
        var args = Array.prototype.slice.apply(arguments);
        debug.apply(null, args.slice(1)); // slice the prefix away, since debug is already prefixed
    }

### notes

All NTLM-fields (`UserName`, `DomainName`, `Workstation`) are also available within `response.locals.ntlm`, which means you can access it through your template engine (e.g. jade or ejs) while rendering (e.g. `<%= ntlm.UserName %>`).





## References

NTLM specification:  
https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-nlmp/b38c36ed-2804-4868-a9ff-8dd3182128e4

A more understandable document describing NTLM:  
http://davenport.sourceforge.net/ntlm.html

NTLM Authentication Scheme for HTTP:  
https://web.archive.org/web/20200724074947/https://www.innovation.ch/personal/ronald/ntlm.html


**NTLM-Authorisation**


![NTLM-Authorisation.png](NTLM-Authorisation.png)
