YAML = require('yamljs');
glob = require('glob');
_ = require('lodash');

routes = require('./routes/index');

module.exports = function(app, io){

  io.on('connection', function (socket) {
    init();

    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });

  var program = getProgram('content');

  function init(){
    program = getProgram('content');
    console.log(program);
  }

  // get programm from content folder and conf from yaml files
  function getProgram(progID){

    var path = __dirname+'/'+progID+'/',
      program = [],
      expos = glob.sync(path+'*/'),
      defaultConf = YAML.load(path+'conf.yaml');

    _.forEach(expos, function(expo,i){

      var e = {
        id:i,
        path:expo,
        conf:_.defaultsDeep(YAML.load(expo+'conf.yaml'),defaultConf),
        steps:glob.sync(expo+'/*.jp*g')
      }

      program.push(e);

    })

    return program;
  }
}
