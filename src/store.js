const MAX_SESSIONS_ALLOWED = 10000;

function SessionStore () {
  this.store = {}
  this.counter = 0;
}

SessionStore.prototype.set = function (sessionId, session, callback) {
    if(!callback) callback = () =>{}
    if(this.counter > MAX_SESSIONS_ALLOWED)   callback(new Error("You've crossed maximum sessions limit.") )
    this.store[sessionId] = session
    this.counter++;
    callback()
}

SessionStore.prototype.get = function (sessionId, callback) {
  if(!callback) callback = () =>{}
  const session = this.store[sessionId]
  callback(null, session)
}

SessionStore.prototype.destroy = function (sessionId, callback) {
  if(!callback) callback = () =>{}
  this.store[sessionId] = undefined
  this.counter--;
  callback()
}

module.exports = SessionStore;