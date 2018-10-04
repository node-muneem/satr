# सत्र (Satr)

A session management plugin for [Muneem](https://github.com/node-muneem/muneem) web framework. It generates session id, creates a cookie for session id, and and entry in session store where more data related to the session can be stored.

```JavaScript
const app = require("muneem")();
const sessionManager = require("satr");
app.use(sessionManager, {
    name : "session-id", //default is '_si' 
    autoCreate : true, //create the session for each request
    autoRenew : true,
    secret : "", //32 or more char long
    life : 3600, //Duration (in seconds) from its creation.
    store : redis, // if not set then Error if env is prod, live, production, or unknown. Print warning message otherwise
    cookie : {
        //check npm cookie package for list of rest of the options
    }
});

app.route({
    uri : "/login",
    to : loginHandler,
});

app.route({
    uri : "/public/url",
    to : publicPageProvider,
});

app.route({
    uri : "/private/url",
    to : privatePageProvider,
    after: authentication
});


function authentication(asked, answer, giveMe){
    //.. check if the user is authorized
    // create session
    const sessionManager = giveMe("session manager");
    sessionManager
}

function loginHandler(asked, answer, giveMe){
    //.. check if session-id exists
    //.. check if the user is authorized
    // Yes: redirect
    // NO
    // create session
    const sessionManager = giveMe("session manager");
    sessionManager
}

```

## Options

*name* : This plugin reads the session-id from cookie first, if not presents then reads from header.

A cookie is baked not only with it's name and value but other attributes like domain, expiry time/duration etc. Check [cookie options](https://www.npmjs.com/package/cookie) for more detail.

*life* of the session (in seconds) will be set to [cookie.expires](https://www.npmjs.com/package/cookie#expires) . 

If *autoCreate* option is set to *true*, this plugin will create session for each request if not created. It's not recommanded as it'll create sessions for static resources as well.

*store* is optional for *dev*, *ref*, *int*, *uat*, *test*, *qa* environments. It'll log a warning. If the store is not provided then the sessions will be saved in memory which is not suitable for production and performance encvironment. A session store should have following methods

* set(sessionId, session, callback)
* get(sessionId, callback)
* end(sessionId, callback)



## Workflow

Once the cookie for a session has been expired, we, as a server, will never know if the session id for the same user was ever created. In case of authorized sessions, we don't want user to login again-and-again on the same browser (and device).



# TODO

transition : {
    newSecret: "",
}

* Separate session-id reader and writer. So the user can decide if he needs to read and write session-id from cookies or headers.
* Cookie-to-header token: each ajax request copies the session-id from the cookie and send it as a header value.
