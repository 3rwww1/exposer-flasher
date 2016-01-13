var YAML = require('yamljs');
var glob = require('glob');
var _ = require('lodash');
var exec = require('child_process').exec;
var mkdirp = require('mkdirp');
var path =  require('path');
var gm = require('gm');
var spawn = require('child_process').spawn;
var del = require('del');

module.exports = function (sockets, tree) {

  // tree

  var program = tree.select('program');
      program.on('update', function(e){
        console.log(e.data.currentData)
        tree.select('captureEnable').set(programHasFlash(e.data.currentData));
      })
      program.set(getProgram('content'));

  var expo = tree.select('expo', 'data');
      expo.on('update', onExpoUpdate);

  var captureStack = tree.select('expo', 'captureStack');
      captureStack.on('update', function(e){
        sockets.emit('captureStack', tree.select('expo','captureStack').get())
      })


  tree.select('captureEnable').on('update', function(e){
    console.log('🔄\t program will '+(e.data.currentData?'':'not')+'need captures.');

    if(e.data.currentData) captureInit();
    else initClients();
  })


  tree.select('captureReady').on('update', function(e) {
    console.log('📷\t camera'+(e.data.currentData?'':' NOT')+' ready');
    tree.select('expo','id').set(0);
    initClients();
  })

  sockets.on('connection', onConnect);

  function onExpoUpdate(){

    console.log('☀\t start', path.basename(expo.path), expo.id);

    // create capture path
    var capturePath = expo.path+'/captures/';
    var prevCaptures = glob.sync(capturePath+'/*/');

    // if(noBackup) del(capturePath); // to connect

    capturePath += _.padLeft( prevCaptures.length + 1, 4, 0)+'/';
    tree.select('expo', 'capturePath').set(capturePath);
    captureStack.set([])

    sockets.emit('newExpo', expo);
  }

  function onConnect(socket){
    console.log('connect');

    socket.on('message', function (data) {
      console.log(data,'message');
          socket.emit('message', 'ok');
    });


    socket.on('capture', capture);
    socket.on('getNewExpo', function(){console.log('newExpo');
      tree.select('expo','id').apply(inc);
    });
    socket.on('getCaptureStack', onGetCaptureStack);
  }

  function onGetCaptureStack(){ sockets.emit('captureStack', captureStack.get())}

  // PROGRAM

  function getProgram(path){
    var path = __dirname + '/' + path + '/',
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
      if(err !== null) console.log('💥\tcamera error ! \n\n',err,'\n\n');
      tree.set('captureReady', (err === null));
    });
  }

  function capture(){
    console.log('📷\t capture !');

    var filename = tree.select('expo','capturePath').get() + '/' +
      _.padLeft(tree.select('expo','captureStack').get().length, 4,0) + '.jpg';

    var cmd = 'gphoto2 --capture-image-and-download \
      --hook-script '+__dirname+'/scripts/captureHook.sh \
      --force-overwrite --filename ' + filename;

    exec(cmd, function (err, stdout, stderr) {
      if (!err) console.log('📷\t new capture : ', path.basename(filename));
      else console.log('💥',err);

      // image conversion
      gm(filename)
        .resize(1920, 1080)
        .write(filename, function (err) {
          if (!err) tree.select('expo','captureStack').push(filename.replace(__dirname+'/content/',''));
          else console.log('💥',err);
        });
    });
  }

  // ANIMATION
  function programHasFlash(program){
    var hasFlash = new RegExp('\\bflash\\b');

    var res = _(program)
      .pluck('steps')
      .flatten()
      .filter(function(d){
        return hasFlash.test(d);
      }).value();

    return (res.length > 0)
  }
  function inc(nb){return nb + 1;}

  function getConfigFile(path){
    var files = glob.sync(path+'/*.yaml');
    if(files.length < 1) return {};
    else return YAML.load(files[0]);
  }
  function initClients(){
    clientWindows = spawn('bash',[__dirname+'/scripts/clientsInit.sh']);
  }

  return function() {
    sockets.off('connection', onConnect);

    tree.off('update', onTreeUpdate);
    for (var k in tree._cursors) {
      tree._cursors[k].off('update');
    }
  };
}
