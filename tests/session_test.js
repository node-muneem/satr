if (!global.Promise) {
    global.Promise = require('q');
}

const path = require('path');
const fs = require('fs');
const chai = require('chai')
, chaiHttp = require('chai-http')
, expected = require('chai').expect;

//process.env.NODE_ENV = "dev";

chai.use(chaiHttp);

const Muneem = require("muneem");
Muneem.setLogger(console);
const Satr = require("./../src/index");
const Store = require("./../src/store");
const store = new Store();
const satr = new Satr();
//describe ('Session', () => {
    

    satr.on('create', (session, asked) => {
        //console.log("Session:" + session.id + " has been created for " + asked.path);
        console.log( JSON.stringify(session,null,4) );
        console.log( store.get(session.id) );
    })
    
    
    /* satr.on('end', (asked, answer, giveMe) => {
    
    }) */
    
    satr.on('renew', (session, asked) => {
        //console.log("Session:" + session.id + " has been renewed for " + asked.path);
        console.log( JSON.stringify(session,null,4) );
        console.log( store.get(session.id) );
    })
    satr.on('invalid', (sessionId, asked) => {
        console.log("Session:" + sessionId + " is invalid for " + asked.path);
    })

    const app = Muneem();
    
    app.use(satr.manager, {
        autoCreate : true,
        secret : "keep it secret and complex that no one can guess",
        life : 5,
        store : store
    });

    function authentication(asked, answer, giveMe){
        const session = asked.getSession(); //current session if exist otherwise new unauthorized session
        if( session.isAuthorized() ){
            // when session-id is not present in request
            // if autoCreate : true then session.isAuthorized() is false;
            // if autoCreate : false then session.isAuthorized() is undefined;
    
            // when session-id is present in request but not authorized
            // if autoCreate : true then session.isAuthorized() is false;
            // if autoCreate : false then session.isAuthorized() is false;
    
            // when session-id is present in request and authorized
            // if autoCreate : true then session.isAuthorized() is true;
            // if autoCreate : false then session.isAuthorized() is true;
    
        }else{
            answer.redirectTo("/login/page");
        }
    }
    
    function loginHandler(asked, answer, giveMe){
        //const authInfo = asked.getAuthInfo();
        //if( authInfo.isValid() ){
            var session = asked.getSession();
            session.authorized = true;
            session.data.userid  = "authInfo.id";
            session.delete( "tempid");
            session.add( "userid", "authInfo.id2" );

            //answer.redirectTo( asked.queryParam.sendTo || "/" );
        /* }else{
            answer.writeJson({ result : "fail"});
        } */
    
    }
    
    function logoutHandler(asked, answer, giveMe){
        var session = asked.getSession();
        session.authorized = false;
        session.end();
        //answer.redirectTo( asked.queryParam.sendTo || "/" );
    }

    function privatePageProvider(asked, answer, giveMe){
        console.log("private page")
    }

    function publicPageProvider(asked, answer, giveMe){
        console.log("private page")
    }
    
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

    /* it('should work as expected.', (done) => {
        chai.request("https://localhost:3005")
            .get('/test')
            .ca(fs.readFileSync(path.join(__dirname, "truststore/ca.crt") ) )
            .then(res => {
                expect(res.status).toBe(200);
                expect(res.text).toBe("I'm glad to response you back.");
                done();
            }).catch( err => {
                done.fail("not expected " + err);
            });
    });
}); */


process.on('warning', e => console.log(e.stack));
process.on('uncaughtException', e => console.log(e.stack));
process.on('unhandledRejection', e => console.log(e.stack));