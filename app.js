var express = require('express');
var app = express();
var logger = require('morgan');
var bodyParser = require('body-parser');
var path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
// app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'content')));

//
// routes
//
app.get('/', function(req, res, next) {
  res.render('index', { title: 'paf!' });
});

app.get('/projection/', function(req, res, next) {
  res.render('default', {id:'projection' });
});
app.get('/monitor/', function(req, res, next) {
  res.render('default', {id:'monitor'});
});

app.get('/captureEnd/',function(req, res){
  app.get('sockets').emit('captureEnd');
  res.send(' ');
})

module.exports = app;
