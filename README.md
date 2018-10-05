# सत्र (Satr)

A session management plugin for [Muneem](https://github.com/node-muneem/muneem) web framework. 

It generates a session id, creates a cookie for session id, and entry in session store where more data related to the session can be stored.

```JavaScript

process.env.NODE_ENV = "dev";

const Muneem = require("muneem");
const satr = new require("satr")();
const store = require("some_store");

satr.on('create', (session, asked) => {
    console.log("Creating a new session");
    console.log( store.get(session.id) );
})
satr.on('renew', (session, asked) => {
    console.log("Renewing an old session");
    console.log( store.get(session.id) );
})
satr.on('invalid', (sessionId, asked) => {
    console.log("Received an invalid session");
})
satr.on('save', (sessionId, asked) => {
    console.log("saved session into cookies and store");
    console.log( store.get(sessionId) );
})

const app = Muneem();
app.use(satr.manager, {
    name : "session-id", //default is '_si' 
    autoCreate : false,
    secret : "keep it secret and complex that no one can guess",// min 32 char or long
    life : 600,//default is 3600
    renewalDuration : 1,//duration before session end when session-id can be renewed
    store : store,
    cookie : {
        httpOnly : true,
        secure : false
    }
});

/******************** Handlers ********************/
function authentication(asked, answer, giveMe){
    const session = asked.getSession(); //current session if exist otherwise new unauthorized session
    if( session.authorized ){
        console.log("It is authorized session");
    }else{
        asked.hasSession = false; //it'll stop saving the temporary session to the store and cookies
        answer.redirectTo("/login?sendTo=" + asked.path);
    }
}

function loginHandler(asked, answer, giveMe){
    //.. validate user
    if( authInfo.isValid() ){
        var session = asked.getSession();
        session.authorized = true;
        //.. save session data to session.data
        /* session.data.userid  = "authInfo.id";
        session.add( "userid", "authInfo.id2" ); 
        session.delete( "tempid");*/

        answer.redirectTo( asked.q.sendTo ); //you'll have to parse query string yourself or use some plugin
    }else{
        answer.write('{ result : "fail"}', "application/json"); 
    }
}

function logoutHandler(asked, answer, giveMe){
    var session = asked.getSession();
    session.authorized = false;
    //.. delete from the store
    answer.redirectTo( asked.q.sendTo || "/" );
}

function privatePageProvider(asked, answer, giveMe){
    console.log("private page")
}

function publicPageProvider(asked, answer, giveMe){
    console.log("private page")
}

/******************** End Handlers ********************/

app.route([{
    uri : "/logout",
    to : logoutHandler,
},{
    uri : "/login",
    to : loginHandler,
},{
    uri : "/public/url",
    to : publicPageProvider,
},{
    uri : "/private/url",
    to : privatePageProvider,
    after: authentication
}]);

app.start();

```

## Options

*name* : This plugin reads the session-id from cookie first, if not presents then reads from header.

A cookie is baked not only with it's name and value but other attributes like domain, expiry time/duration etc. Check [cookie options](https://www.npmjs.com/package/cookie) for more detail.

*life* of the session (in seconds) will be set to [cookie.expires](https://www.npmjs.com/package/cookie#expires) . 

If *autoCreate* option is set to *true*, this plugin will create session for each request if it was not previously created. Since all the sessions get saved to store at the time of sending the response, `autoCreate:true` may create an extra overhead on the session store. You may set it *false* to create sessions manually for login sessions only.  If there is no session created, it'll not send cookies to the client. There are some cookie laws which don't want you to create cookies without user permission or create cookies relevant to your site only not luring ads. 

*store* is optional for *dev*, *ref*, *int*, *uat*, *test*, *qa* environments. It'll log a warning. If the store is not provided then the sessions will be saved in memory which is not suitable for production and performance encvironment. A session store should have following methods

* set(sessionId, session, callback)
* get(sessionId, callback)
* destroy(sessionId, callback)

## Useful Points

* A session-id is not expected once it's cookie has been expired. So the expiry time for auth session cookies should be longer for good user experience.
* Short session life is an overhead on server (session store). But long life lure the hackers


## Useful links

* [Session_Management_Cheat_Sheet](https://www.owasp.org/index.php/Session_Management_Cheat_Sheet)
* [Cookies in RESTful webservices](https://softwareengineering.stackexchange.com/questions/141019/should-cookies-be-used-in-a-restful-api#141434)

## TODO

* *x-forwarded-proto* header