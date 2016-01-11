var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');

//
// express settings
//
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'content')));

//
// http server
//
var port = 3000;
app.set('port', port);

var server = http.createServer(app);
server.listen(port);
server.on('listening', onListening);

var io = require('socket.io')(server);

//
// routes
//
app.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

app.get('/projection/', function(req, res, next) {
  res.render('projection', { title: 'projection' });
});
app.get('/monitor/', function(req, res, next) {
  res.render('monitor', { title: 'monitor' });
});

app.get('/captureEnd/',function(req, res){
  io.sockets.emit('captureEnd');
  res.send(' ');
})

//
// lanch manager
//
require('./manager')(app, io);

//
// utils
//

function initClients(){
  clientWindows = spawn('bash',[__dirname+'/scripts/initClients.sh']);
};

function onListening() {

  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);

  initClients();
}
