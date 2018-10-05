function Session(id,life){
    this.id = id;
    this.life = life || 3600000;//in milli-seconds
    this.birthTime = Date.now();
    //this.lastAccessTime;
    //this.state = data.state; //for future use
    this.authorized = false;
    this.data = {};
}

Session.prototype.add = function(key, val){
    this.data[key] = val;
}

Session.prototype.get = function(key){
    return this.data[key];
}

Session.prototype.delete = function(key){
    delete this.data[key];
}

Session.prototype.end = function(){
    this.life = 0;
}

module.exports = Session;