YAML = require('yamljs');
glob = require('glob');
_ = require('lodash');
exec = require('child_process').exec;


module.exports = function(app, io){

  var program = getProgram('content');
  var currentExpoId = 0;

  //
  // socket events
  //
  io.on('connection', onConnect);


  //
  // event handlers
  //

  function onConnect(socket){
    nextExpo();
    socket.on('my other event', function (data) {
      console.log(data);
    });
    socket.on('capture', onCapture);
    socket.on('expoEnd', onExpoEnd);
  }

  function onCaptureEnded(error, stdout, stderr) {
    console.log('📷  capture end !',error)
    io.sockets.emit('nextStep');
  }

  function onExpoEnd(){
    nextExpo();
  }

  //
  // actions
  //

  function nextExpo(){
    program = getProgram('content');
    var currentExpo = program[currentExpoId % program.length ]

    console.log('newExpo', currentExpo.path);
    io.emit('newExpo', currentExpo);

    currentExpoId++;
    currentExpoId =  currentExpoId % program.length;
  }


  function captureInit(){
    var cmd = 'killall PTPCamera;gphoto2 --auto-detect;gphoto2 --summary';
    exec(cmd, function(error, stdout, stderr) { console.log('captureInit::', error);});
  }

  function onCapture(){
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


  // get programm from content folder and conf from yaml files
  function getProgram(progID){
    var path = __dirname+'/'+progID+'/',
      program = [],
      expos = glob.sync(path+'*/'),
      progDefaultConf = getConfigFile(path);
      defaultConf = getConfigFile(__dirname);

    _.forEach(expos, function(expo,i){


      // conf conversions
      var conf = _.defaultsDeep(getConfigFile(expo),progDefaultConf,defaultConf)

      conf.duration = conf.duration * 1000 * 60;
      conf.interval = conf.interval * 1000;
      conf.animUpdateInterval = conf.animUpdateInterval * 1000;


      var steps = _.map(glob.sync(expo+'/*.jp*g'),function(d){
          return d.replace(path,'');
        });
      var e = {
        id:i,
        path:expo,
        conf: conf,
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
