YAML = require('yamljs');
glob = require('glob');
_ = require('lodash');
exec = require('child_process').exec;
Baobab = require('baobab');
mkdirp = require('mkdirp');
path =  require('path');
gm = require('gm');
spawn = require('child_process').spawn;

module.exports = function(app, io){

  // + get conf on load in monitor
  // + auto detect camera and wait for it if not ready
  // + correct feeback in console
  // +

  // tree
  var tree = new Baobab({
    program:getProgram('content'),
    expo:{
      id:-1,
      data:{},
      capturePath:'',
      captureStack:[]
    },
    cameraReady:'',
  });

  var expoId = tree.select('expo', 'id');
      expoId.on('update', function(e) {
        var program = tree.get('program');
        expo.set(program[expoId.get() % program.length]);
      });

  var expo = tree.select('expo', 'data');
      expo.on('update', onExpoUpdate);

  var captureStack = tree.select('expo', 'captureStack')
      captureStack.on('update', function(e){
        io.emit('captureStack', tree.select('expo','captureStack').get())
      })

  tree.select('expo', 'capturePath').on('update', function(e){
    mkdirp.sync(e.data.currentData);
  })

  tree.select('cameraReady').on('update', function(e) {
    console.log('📷\t camera'+(e.data.currentData?'':' not')+' ready');
  })

  // look for camera on server lanch
  // captureInit();

  //
  // socket events
  //
  io.on('connection', onConnect);


  //
  // event handlers
  //

  function onExpoUpdate(e){
    var expo = e.data.currentData;

    console.log('start', expo.path);

    // create capture path
    var capturePath = expo.path+'/captures/';
    var prevCaptures = glob.sync(capturePath+'/*/');
    capturePath += _.padLeft( prevCaptures.length + 1, 4, 0)+'/';
    tree.select('expo', 'capturePath').set(capturePath)
    captureStack.set([])

    io.emit('newExpo', expo);
  }

  function onConnect(socket){
    socket.on('capture', capture);
    socket.on('getNewExpo', function(){expoId.apply(inc)});
    socket.on('getCaptureStack', onGetCaptureStack);
  }

  function onGetCaptureStack(){
    io.emit('captureStack', captureStack.get())
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

      // merge configs
      var conf = _.defaultsDeep(getConfigFile(expo),progDefaultConf,defaultConf)

      // convert configs values
      conf.duration = conf.duration * 1000 * 60;
      conf.interval = conf.interval * 1000;
      conf.animUpdateInterval = conf.animUpdateInterval * 1000;

      // remove filesystem path from steps path
      var steps = _.map(glob.sync(expo+'/*.jp*g'),function(d){ return d.replace(path,'');});

      // build final expo
      var formatedExpo = { id:i, path:expo, conf: conf, steps: steps}

      program.push(formatedExpo);
    })
    return program;
  }

  // CAPTURE

  function captureInit(){
    console.log('📷\t initializing …');

    var cmd = 'killall PTPCamera; gphoto2 --auto-detect;gphoto2 --summary';
    exec(cmd, function(err, stdout, stderr) {
      if(err !== null) tree.set('cameraReady', false);
      else tree.set('cameraReady', true);
    });
  }

  function capture(){
    console.log('📷\t capture !');

    var filename = tree.select('expo','capturePath').get() + '/' +
      _.padLeft(tree.select('expo','captureStack').get().length, 4,0) + '.jpg';

    var cmd = 'gphoto2 --capture-image-and-download \
      --hook-script '+__dirname+'/scripts/hook.sh \
      --force-overwrite --filename ' + filename;

    exec(cmd, function (err, stdout, stderr) {
      if (!err) console.log('📷\t new capture : ', path.basename(filename));
      else console.log(err);

      // image conversion
      gm(filename)
        .resize(1920, 1080)
        .write(filename, function (err) {
          if (!err) tree.select('expo','captureStack').push(filename.replace(__dirname+'/content/',''));
          else console.log(err);
        });
    });
  }

  // ANIMATION

  function inc(nb){return nb + 1;}

  function getConfigFile(path){
    var files = glob.sync(path+'/*.yaml');
    if(files.length < 1) return {};
    else return  YAML.load(files[0]);
  }

}
