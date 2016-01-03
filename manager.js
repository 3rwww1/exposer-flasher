YAML = require('yamljs');
glob = require('glob');
_ = require('lodash');
exec = require('child_process').exec;


module.exports = function(app, io){

  var program = getProgram('content');
  var currentStep = 0;

  //
  // socket events
  //
  io.on('connection', onConnect);

  //
  // event handlers
  //

  function onConnect(socket){
    init(socket);
    socket.on('my other event', function (data) {
      console.log(data);
    });
  }

  //
  // actions
  //

  function init(socket){
    program = getProgram('content');
    socket.emit('newExpo', program[0]);

    currentStep++;
    io.sockets.emit('step', currentStep);
  }


  function captureInit(){
    var cmd = 'killall PTPCamera;gphoto2 --auto-detect;gphoto2 --summary;';

    exec(cmd, function(error, stdout, stderr) {
      console.log('ok', stdout)
    });
  }

  function capture(p){

    var param = _.defaults(p,{
      hook:__dirname+'/script/hook.sh',
      filename:__dirname+'/test.jpg'
    });

    var cmd = 'gphoto2 --capture-image-and-download \
      --hook-script '+param.conf+' \
      --force-overwrite --filename ' + param.filename;

    exec(cmd, function(error, stdout, stderr) {
      // command output is in stdout
      console.log('ok', stdout, param)
    });

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
