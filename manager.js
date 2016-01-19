var YAML = require('yamljs');
var glob = require('glob');
var _ = require('lodash');
var exec = require('child_process').exec;
var mkdirp = require('mkdirp');
var path =  require('path');
var gm = require('gm');
var spawn = require('child_process').spawn;
var del = require('del');
var serialPort = require("serialport");

module.exports = function (sockets, tree) {

  // tree and cursors
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

  tree.select('expo', 'capturePath').on('update', function(e){
    mkdirp.sync(e.data.currentData);
  })

  // init
  killClients();

  arduinoSendState(1,0,0);

  setTimeout(function(){
    console.log("ok");
    arduinoSendState(0,0,0);
  },10000)

  // listen to sockets
  sockets.on('connection', onConnect);

  // on new client create socket events
  function onConnect(socket){
    console.log('connect');

    socket.on('message', function (data) {
      console.log(data,'message');
      socket.emit('message', 'ok');
    });

    socket.on('capture', capture);
    socket.on('getNewExpo', function(){
      console.log('newExpo');

      // pump actions

      //

      setTimeout(function(){
        tree.select('expo','id').apply(incExpo);
      }, 1000);

    });
    socket.on('getCaptureStack', onGetCaptureStack);
  }

  // when onExpoUpdate ask : send new expo to client
  function onExpoUpdate(e){
    var expo = e.data.currentData;

    console.log('☀\t',expo.id,expo.path);
    console.log('☀\t start ','for '+expo.conf.duration+' sec. every '+expo.conf.interval+' sec.');

    // create capture path
    var capturePath = expo.path+'/captures/';
    if(!expo.conf.backup) del(capturePath+'/*/');

    var prevCaptures = glob.sync(capturePath+'/*/');
    capturePath += _.padLeft( prevCaptures.length + 1, 4, 0)+'/';
    tree.select('expo', 'capturePath').set(capturePath);
    captureStack.set([]);

    arduinoSendState(1,0,0);
    setTimeout(function(){

      arduinoSendState(0,0,0);
      sockets.emit('newExpo', expo);

    },expo.conf.cleanDuration);

  }

  // send image stack when asked
  function onGetCaptureStack(){ sockets.emit('captureStack', captureStack.get())}

  // PROGRAM

  // turn content folder into a program object
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

  // kill all previously opened browsers
  function killClients(){
    var cmd = 'killall PTPCamera; killall -9 "Google Chrome"; killall -9 "Chromium";';
    exec(cmd, function(err, stdout, stderr) { if(err !== null) console.log('error while killing clients',err);});
  }

  // lanch camera detection
  function captureInit(){
    console.log('📷\t initializing …');

    var cmd = 'killall PTPCamera; gphoto2 --auto-detect;gphoto2 --summary';
    exec(cmd, function(err, stdout, stderr) {
      if(err !== null) console.log('💥\tcamera error ! \n\n',err,'\n\n');
      tree.set('captureReady', (err === null));
    });
  }
  // capture image from camera
  function capture(){
    console.log('📷\t capture !');

    var filename = tree.select('expo','capturePath').get() + '/' +
      _.padLeft(tree.select('expo','captureStack').get().length, 4,0) + '.jpg';

    var cmd = 'gphoto2 --capture-image-and-download \
      --hook-script '+__dirname+'/scripts/captureHook.sh \
      --force-overwrite --filename ' + filename;

    exec(cmd, function (err, stdout, stderr) {
      if (!err) { console.log('📷\t new capture : ', path.basename(filename));
      } else {
        console.log('💥',err); sockets.emit('captureEnd');
      }
      // image conversion
      gm(filename)
        .resize(1920, 1080)
        .write(filename, function (err) {
          if (!err) tree.select('expo','captureStack').push(filename.replace(__dirname+'/content/',''));
          else console.log('💥',err);
        });
    });
  }

  function arduinoSendState(p0,p1,p2){

    console.log('sendState :',p0,p1,p2);

    serialPort.list( function (err, ports) {

      var isArduino = new RegExp('\\bArduino\\b');
      var port = _(ports).filter(function(p){ return isArduino.test(p.manufacturer) }).first();

      if(err)console.log(err, port);

      if(!_.isUndefined(port)) {
        console.log(port.manufacturer, port.comName);


        var arduino = new serialPort.SerialPort( port.comName, {baudrate: 9600});

        arduino.on("open", function(err) {
          arduino.on('data', function(datain) {
            console.log("ARD:   " + datain.toString());
            // dataToPumps(p0,p1,p2)
          });

          setTimeout(function(){ dataToPumps(p0,p1,p2) }, 2000)
        });

      }

      function dataToPumps(p0,p1,p2){
        pumpByte = p0 | p1<<1 | p2<<2;

        arduino.write([pumpByte], function(err, results) {
          if(err)console.log(err);
          console.log('results ' + results);

          arduino.close(function(err){
            console.log('closing arduino')
            if(err)console.log(err);
          });
        })
      }
    });
  }


  // UTILS
  function programHasFlash(program){
    var hasFlash = new RegExp('\\bflash\\b');

    var res = _(program)
      .pluck('steps')
      .flatten()
      .filter(function(d){ return hasFlash.test(d);})
      .value();

    return (res.length > 0)
  }

  function incExpo(nb){

    return (nb + 1) % tree.select('program').get().length;

  }

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
    for (var k in tree._cursors) {
      tree._cursors[k].off('update');
    }
  };
}
