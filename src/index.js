var cookieParser = require('cookie');
var cookieSignature = require('cookie-signature');
const hyperId = require('hyperid')();
var Session = require('./session');
var Store = require('./store');
var EventEmitter = require('events').EventEmitter;
const eventEmitter = new EventEmitter();


function SessionManager(options){

  /**
   * Read Session ID from cookie. If expired then renew, if not present then create
   */
  this.createSession = function(){
    const asked = this;
    if(asked._session) return asked._session;
    var sessionId = "";
    if( asked.cookie() ){
      var cookies = cookieParser.parse( asked.cookie() );
      sessionId = cookies[ options.name ];
    }else{
      sessionId = asked.headers[ options.name ];
    }
    
    let session = {};
    if( sessionId ){
      //decrypt it
      const decryptedSessionId = cookieSignature.unsign(sessionId, options.secret);
      if (decryptedSessionId ) {
        //read session detail from the store
        options.store.get(decryptedSessionId, (err, sessionFromStore) => {
          if(err){
            throw Error(err);
          }else if( sessionFromStore){
            if( shouldRenew(sessionFromStore, options.renewalDuration) ){
              //delete previous session
              options.store.destroy(sessionFromStore.id, err=> {
                if(err) throw Error(err);
                //just change the session-id and birth time to renew it
                sessionFromStore.id = generateSessionId();
                sessionFromStore.birthTime = Date.now();
                session = sessionFromStore;
                eventEmitter.emit("renew", session, asked);
              });
            }else{//continue with previous session
              session = sessionFromStore;
            }
          }else{ //session detail is not present in store
            session = createSession(asked);  
          }
        }); //End of get session detail from store
      } else {
        eventEmitter.emit("invalid", sessionId, asked);
        if(options.autoCreate){
          session = createSession(asked);
        }else{
          throw Error("Invalid session-id");
        }
      }
    }else{ //session-id is not presnet in request
      session = createSession(asked);
    }
    this.hasSession = true;
    return session;
  }

  /**
   * Creates a new session object
   */
  function createSession(asked){
    const session = new Session(generateSessionId(), options.life);
    eventEmitter.emit("create", session, asked);
    return session;
  }
}


function generateSessionId(){
  return hyperId();
}

const defaultOptions = {
  name : "_si",
  autoCreate : true, //create the session for each request automatically
  //secret : "It is required", //32 or more char long
  life: 3600000, //in milli-seconds = 1 day
}

const defaultCookieOptions = {
    path : "/",
    // should not be accessed by client-side APIs
    httpOnly : false,
    // should be used over HTTPS
    secure : true,
    //sent by the same origin as the target domain.
    sameSite : null,
    /*
      first-party cookies has same domain as sitename
      thrid-party cookies may have different domain than sitename
    */
    domain : null,
}

const env = process.env.NODE_ENV;
const devEnvList = [ "dev", "ref", "int", "uat", "test", "qa" ];
function buildOptions(userOptions){
  const options =  {};
  options.secret = userOptions.secret;
  options.name = userOptions.name || defaultOptions.name;
  options.autoCreate = pickDefined(userOptions, defaultOptions, "autoCreate" );
  options.life = (userOptions.life * 1000) || defaultOptions.life;
  options.renewalDuration = ( userOptions.renewalDuration * 1000) || 1;
  if(!userOptions.store){
    if( devEnvList.indexOf(env) === -1){
      throw Error("You're storing sessions in memory in non-dev environment.");
    }else{
      options.store = new Store();
    }
  }else{
    options.store = userOptions.store;
  }
  return options;
}


function buildCookieAttributes (options) {
  return {
    path: options.path || defaultCookieOptions.path,
    httpOnly: pickDefined(options, defaultCookieOptions, "httpOnly"),
    secure: pickDefined(options, defaultCookieOptions, "secure"), 
    sameSite: options.sameSite || defaultCookieOptions.sameSite, 
    domain: options.domain || defaultCookieOptions.domain,
    /*
      session cookie: should be deleted on browser close. don't have exiration date
      persistent cookie / tracking cookies: expires at a specific date or after a specific length of time. Sent back to the server everytime.
    */
    //expires: getExpiryDate(options),  
    // maxAge takes precedence over expires. But browser may or may not be obeying this rule. So not setting it
    //maxAge : getExpires(options), 
  }
}

/**
 * When session expiry is just renewalDuration far from the current time 
 * @param {object} session 
 */
function shouldRenew(session, renewalDuration){
  return (session.birthTime + session.life - renewalDuration ) <  Date.now();
}

function pickDefined(L, R, P){
  return L[P] !== undefined ? L[P] : R[P];
}

function plugin(){
}

plugin.prototype.on = function(evenName, fn){
  eventEmitter.on(evenName, fn);
}

plugin.prototype.manager = function(muneem, options){
  if(!options || !options.secret) throw Error("Satr: secret is required.");
  
  const opts = buildOptions(options);
  if( !options.cookie ) options.cookie = {};
  const cookieOpts = buildCookieAttributes(options.cookie);
  /* if( muneem.context.get("https") === true){
    cookieOpts.secure = true;
  } */

  var SM = new SessionManager(opts);

  muneem.addToAsked("getSession", SM.createSession );

  if( options.autoCreate ){
    //register handler to create session for each request (if not exist)
    muneem.after("route", (asked, answer) => {
      asked._session = asked.getSession();
    });
  }

  //Don't save the session if not created
  muneem.before("send", (asked, answer) => {
    if( asked.hasSession ){
      var session = asked.getSession();
      if(session.life === 0){//session has been ended
        return;
      }
      cookieOpts.expires = new Date(session.birthTime + session.life);
      var encryptedId = cookieSignature.sign(session.id, opts.secret);
      answer.cookie( cookieParser.serialize( opts.name, encryptedId, cookieOpts) );
      opts.store.set(session.id, session);
      eventEmitter.emit("save", session, asked);
    }
  });
}

module.exports = plugin;