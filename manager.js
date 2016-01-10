YAML = require('yamljs');
glob = require('glob');
_ = require('lodash');
exec = require('child_process').exec;
Baobab = require('baobab');


module.exports = function(app, io){

  // tree
  var tree = new Baobab({
    program:getProgram('content'),
    expo:{ id:-1, data:{} },
    cameraReady:''
  });

  var expoId = tree.select('expo', 'id');
      expoId.on('update', function(e) {
        var program = tree.get('program');
        expo.set(program[expoId.get() % program.length]);
      });

  var expo = tree.select('expo', 'data');
      expo.on('update', function(e) {
        console.log(e.data.currentData)
        io.emit('newExpo', e.data.currentData);
      })

  tree.select('cameraReady').on('update', function(e) {
    console.log('📷\t camera'+(e.data.currentData?'':' not')+' ready');
  })

  // look for camera on server lanch
  captureInit();

  //
  // socket events
  //
  io.on('connection', onConnect);


  //
  // event handlers
  //

  function onConnect(socket){

    socket.on('capture', capture);
    socket.on('expoEnd', function(){expoId.apply(inc)});

    expoId.apply(inc);

  }

  function onCaptureEnded(error, stdout, stderr) {
    console.log('📷\t capture end !', error);
  }

  //
  // actions
  //

  // PROGRAM

  function getProgram(path){
    var path = __dirname+'/'+path+'/',
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
      var e = { id:i, path:expo, conf: conf, steps: steps}
      program.push(e);
    })
    return program;
  }

  // CAPTURE

  function captureInit(){
    var cmd = 'killall PTPCamera;gphoto2 --auto-detect;gphoto2 --summary';
    exec(cmd, function(error, stdout, stderr) {
      if(error !== null) tree.set('cameraReady', false);
      else tree.set('cameraReady', true);
    });
  }

  function capture(){
    console.log('📷\t capture start !');

    var filename = 'content/ok.jpg';

    var cmd = 'gphoto2 --capture-image-and-download \
      --hook-script '+__dirname+'/scripts/hook.sh \
      --force-overwrite --filename ' + filename;

    exec(cmd,onCaptureEnded);
  }


  // ANIMATION

  function inc(nb){return nb + 1;}

  function getConfigFile(path){
    var files = glob.sync(path+'/*.yaml');
    if(files.length < 1) return {};
    else return  YAML.load(files[0]);
  }

}
