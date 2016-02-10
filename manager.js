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
var onExit = require('on-exit');
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');


module.exports = function (sockets, tree) {

  //
  // tree and cursors
  //
  var program = tree.select('program');
      program.on('update', function(e){
        console.log(e.data.currentData)
        tree.select('captureEnable').set(programHasFlash(e.data.currentData));
      })
      program.set(getProgram('content'));

  var expo = tree.select('expo', 'data');
      expo.on('update', onExpoUpdate);

  var conf = tree.select('expo','data','conf')

  var captureStack = tree.select('expo', 'captureStack');
      captureStack.on('update', function(e){
        var stack = e.data.currentData;
        //sockets.emit('captureStack', tree.select('expo','captureStack').get())
        if(stack.length > 0) sockets.emit('newCapture', _.last(stack));
        var r = conf.get('timelapsRefresh');

        if((stack.length % r === Math.round(r / 2)) && ( conf.get('showMonitor') || conf.get('showLiveVlc') ) ) refreshTimelaps();
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

  // listen to sockets
  sockets.on('connection', onConnect);

  onExit(function() {
    console.log('"💦\t pump stops !');
    arduinoSendState(0,0,0);
  });


  // on new client create socket events
  function onConnect(socket){

    socket.on('capture', capture);
    socket.on('getNewExpo', function(){
      setTimeout(function(){ tree.select('expo','id').apply(incExpo) }, 1500);
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
    // if(!expo.conf.backup) del(capturePath+'/*/');

    var prevCaptures = glob.sync(capturePath+'/*/');
    capturePath += _.padLeft( prevCaptures.length + 1, 4, 0)+'/';

    tree.select('expo', 'capturePath').set(capturePath);

    console.log('🔄\t expo ',tree.get('expo','id'));

    if(tree.get('expo','id') === 1){

      arduinoSendState(1,0,0);
      console.log("💦\t pump stops in ", conf.get('cleanDuration'));

      setTimeout(function(){

        // empty the stack and send it to client
        captureStack.set([]);
        onGetCaptureStack();

        arduinoSendState(0,0,0);

        setTimeout(function(){ sockets.emit('newExpo', expo)}, 2500);

      }, conf.get('cleanDuration'));

    }else{
      sockets.emit('newExpo', expo);
    }
  }

  // send image stack when asked
  function onGetCaptureStack(){ sockets.emit('captureStack', captureStack.get()) }

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
      conf.cleanDuration = conf.cleanDuration * 1000;

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
    var cmd = 'killall PTPCamera; killall -9 "Google Chrome";killall -9 "VLC"; killall -9 "Chromium";';
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
      if (!err) {

        console.log('📷\t new capture : ', path.basename(filename));

        // image conversion
        gm(filename)
        .resize(conf.get('screenWidth'), conf.get('screenHeight'))
        .quality(conf.get('imageQuality'))
        .write(filename, function (err) {
          if (!err) {
            var name = filename.replace(__dirname+'/content/','');
            tree.select('expo','captureStack').push(name);
          } else {
            console.log('💥',err);
          }
        });

      } else {
        console.log('💥',err);
         setTimeout(function(){ sockets.emit('captureEnd'), 2000});
      }

    });
  }

  setTimeout(refreshTimelaps, 3000)
  function refreshTimelaps( speed, zoom){

    // compilation de la video "live" à partir des JPEG pris par l'appareil photo

    speed = typeof speed !== 'undefined' ? speed : 1;
    zoom  = typeof zoom  !== 'undefined' ? zoom  : 1;

    var mov_w  = 1920,
        mov_h  = 1037,
        ratio  = mov_w/mov_h,
        crop_w = Math.round(mov_w*zoom),
        crop_h = Math.round(crop_w/ratio),
        //crop_x = Math.round((crop_w - mov_w)/2),
        //crop_y = Math.round((crop_h - mov_h)/2),
        crop_x = crop_w - mov_w, //nbpixels*crop_w
        crop_y = 0, //nbpixels*crop_h
        speedTransfo = 1+(speed - 1)/7,

        movie = new ffmpeg();
        tree.get('program').forEach(function(exp, i){

          var capturePath = exp.path+'/captures/';
          var prevCaptures = glob.sync(capturePath+'/*/');

          if((prevCaptures.length > 0) && (i <= tree.get('expo','id')) ){

            var lastCapture = _.last(prevCaptures);
            var imageCount = glob.sync(lastCapture+'*.jpg').length;

            if(imageCount > 0){
              console.log('🎥\t add ',imageCount,' img from ',lastCapture, ' to queue');
              movie.addInput(lastCapture+'*.jpg');
              movie.inputOption(['-pattern_type','glob']);
            }
          }
        })

        movie.withFps(25)
        //crf valeur à modifier si l'on veut que la vidéo se compile plus rapidement. On agit ici sur la compression et la qualité de la vidéo.
        .addOptions(['-pix_fmt yuv420p','-c:v libx264', '-preset ultrafast', '-crf 22'])
        .addOptions(['-r 25'])
        .withVideoFilter('scale='+crop_w+':-1')
        .withVideoFilter('crop='+mov_w+':'+mov_h+':'+crop_x+':'+crop_y+'')
        .withVideoFilter('setpts=(1*'+speedTransfo+')*PTS')
        .on('end', function(){
          console.log('refreshTimelaps ok !');
          fs.renameSync('public/live.tmp.mp4','public/live.mp4');
        })
        .on('error', function(err) { console.log('an error happened: ' + err.message);})
        .saveToFile('public/live.tmp.mp4');

  };

  // send pump state to arduino
  function arduinoSendState(p0,p1,p2){

    console.log('💦\t',p0,p1,p2);

    serialPort.list( function (err, ports) {

      var isArduino = new RegExp('\\bArduino\\b');
      var port = _(ports).filter(function(p){ return isArduino.test(p.manufacturer) }).first();

      if(err) console.log('💦\t',err, port);

      if(!_.isUndefined(port)) {
        console.log('💦\t',p0,p1,p2, port.comName, port.manufacturer);
        var arduino = new serialPort.SerialPort( port.comName, {baudrate: 9600});
        arduino.on("open", function(err) {
          arduino.on('data', function(datain) {
            console.log('💦\t ',port.comName,' response : '+ datain.toString());
          });
          setTimeout(function(){ dataToPumps(p0,p1,p2) }, 2000);
        });

      }

      function dataToPumps(p0,p1,p2){
        pumpByte = p0 | p1<<1 | p2<<2;
        arduino.write([pumpByte], function(err, results) {
          if(err)console.log(err);
          console.log('💦\t pump signal ' + results);

          arduino.close(function(err){
            console.log('💦\t closing arduino')
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
    console.log('init clients');

    if(conf.get('showMonitor')) initClient('initMonitor');
    if(conf.get('showProjection')) initClient('initProjection');
    if(conf.get('showVideoBackup')) initClient('initVideoBackup');
    if(conf.get('showLiveVlc')) var clientWindows = spawn('bash',[__dirname+'/scripts/initLiveVlc.sh', 'public/live.mp4']);

  }

  function initClient(script){
    var clientWindows = spawn('bash',[__dirname+'/scripts/'+script+'.sh']);
  }


  return function() {
    sockets.off('connection', onConnect);
    for (var k in tree._cursors) {
      tree._cursors[k].off('update');
    }
  };
}
