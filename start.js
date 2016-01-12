var http = require('http');
var io = require('socket.io');


var app =  require('./app');
var tree =  require('./state');
var manager = require('./manager');

var server = http.createServer(app);
server.listen(3000);

var socketsServer = http.createServer();
socketsServer.listen(3001);

var sockets = io(socketsServer);
app.set('sockets', sockets);

var unbind = manager(sockets,tree);

if(module.hot){

  module.hot.accept('./app.js', function(){
    server.removeListener('request',app);
    app = require('./app');
    app.set('sockets', sockets);
    server.on('request', app);
  });
  module.hot.accept('./manager.js', function(){
    unbind();
    unbind = require('./manager')(sockets, tree);
  });
}
