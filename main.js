var routes = require('./routes/index');

module.exports = function(app, io){

  io.on('connection', function (socket) {
    init();

    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });


  function init(){
    getConf();
  }

  function getConf(){

  }
}
