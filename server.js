var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');

// app settings
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'content')));

// server setting
var port = 3000;
app.set('port', port);

var server = http.createServer(app);

server.listen(port);
server.on('listening', onListening);

var io = require('socket.io')(server);

// routes setting

app.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

app.get('/projection/', function(req, res, next) {
  res.render('projection', { title: 'projection' });
});

app.get('/yio/',function(req, res){
  io.sockets.emit('test', 'flash');
  res.send('Hello World!');
})

// lanch main
require('./manager')(app, io);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}
