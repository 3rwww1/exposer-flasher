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
    socket.on('capture', capture);
  }

  //
  // actions
  //

  captureInit();

  function init(socket){
    program = getProgram('content');
    socket.emit('newExpo', program[0]);
  }


  function captureInit(){
    var cmd = 'killall PTPCamera;gphoto2 --auto-detect;gphoto2 --summary';
    exec(cmd, function(error, stdout, stderr) { console.log('captureInit::', error);});
  }

  function capture(){
    console.log('📷  capture start !');
    var param = {
      hook:__dirname+'/scripts/hook.sh',
      filename:__dirname+'/content/test.jpg'
    };

    var cmd = 'gphoto2 --capture-image-and-download \
      --hook-script '+param.hook+' \
      --force-overwrite --filename ' + param.filename;

    exec(cmd,onCaptureEnded);
  }

  function onCaptureEnded(error, stdout, stderr) {
    console.log('📷  capture end !',error)
    io.sockets.emit('nextStep');
  }

  // get programm from content folder and conf from yaml files
  function getProgram(progID){
    var path = __dirname+'/'+progID+'/',
      program = [],
      expos = glob.sync(path+'*/'),
      progDefaultConf = getConfigFile(path);
      defaultConf = getConfigFile(__dirname);

    _.forEach(expos, function(expo,i){
      var steps = _.map(glob.sync(expo+'/*.jp*g'),function(d){
          return d.replace(path,'');
        });
      var e = {
        id:i,
        path:expo,
        conf:_.defaultsDeep(getConfigFile(expo),progDefaultConf,defaultConf),
        steps: steps
      }

      program.push(e);
    })
    return program;
  }

  function getConfigFile(path){
    var files = glob.sync(path+'/*.yaml');
    if(files.length < 1) return {};
    else return  YAML.load(files[0]);
  }

}
