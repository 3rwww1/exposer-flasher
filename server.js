var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var http = require('http');

//
// http server
//


var port = 3000;
var server = http.createServer(app);
server.listen(port);
server.on('listening', onListening);

var io = require('socket.io')(server);


//
// lanch manager
//
require('./manager')(app, io);

//
// utils
//

function onListening() {

  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('🌀\t server up and listening at ' + bind + '\n');
}
