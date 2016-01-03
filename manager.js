YAML = require('yamljs');
glob = require('glob');
_ = require('lodash');

module.exports = function(app, io){

  io.on('connection', function (socket) {

    init(socket);
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });



  app.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
  });

  app.get('/yio/',function(req, res){
    res.send('Hello World!\n');
  })

  var program = getProgram('content');
    var i = 0;

  function init(socket){
    console.log(init);

    program = getProgram('content');
    socket.emit('newExpo', program[0]);

      i++;

    io.sockets.emit('step', i);
    // setInterval(function(){

    //   i++;

    //   socket.emit('step', i);

    // }, program[0].conf.capt.interval * 1000)
  }

  // get programm from content folder and conf from yaml files
  function getProgram(progID){

    var path = __dirname+'/'+progID+'/',
      program = [],
      expos = glob.sync(path+'*/'),
      defaultConf = YAML.load(path+'conf.yaml');

    _.forEach(expos, function(expo,i){
      var steps = _.map(glob.sync(expo+'/*.jp*g'),function(d){
          return d.replace(path,'');
        });
      var e = {
        id:i,
        path:expo,
        conf:_.defaultsDeep(YAML.load(expo+'conf.yaml'),defaultConf),
        steps: steps
      }

      program.push(e);

    })

    return program;
  }
}
