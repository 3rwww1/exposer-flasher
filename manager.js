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
    socket.on('capture', capture);
    socket.on('expoEnd', onExpoEnd);
    socket.on("refreshTimelaps", onRefreshTimelaps);
  }

  function onCaptureEnded(error, stdout, stderr) {
    console.log('📷  capture end !',error)
    io.sockets.emit('nextStep');
  }

  function onExpoEnd(){
    nextExpo();
  }


  function onRefreshTimelapsEnd(){
    console.log('timelapse updated');
    io.sockets.emit("refreshTimelapsEnd");
  };
  function onRefreshTimelaps(param){
    console.log("refreshTimelaps zoom",param[1],"speed",param[0]);
    refreshTimelaps(param[0],param[1]);
  };

  //
  // actions
  //


  // PROGRAM

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

  function nextExpo(){
    program = getProgram('content');
    var currentExpo = program[currentExpoId % program.length ]

    console.log('newExpo', currentExpo.path);
    io.emit('newExpo', currentExpo);

    currentExpoId++;
    currentExpoId =  currentExpoId % program.length;
  }

  // CAPTURE

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


  // ANIMATION

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

        proc = new ffmpeg({ source: 'public/exposure/%04d.jpg' })

        .withFps(25)
        //crf valeur à modifier si l'on veut que la vidéo se compile plus rapidement. On agit ici sur la compression et la qualité de la vidéo.
        .addOptions(['-pix_fmt yuv420p','-c:v libx264', '-preset ultrafast', '-crf 22'])
        .addOptions(['-r 25'])
        .withVideoFilter('scale='+crop_w+':-1')
        .withVideoFilter('crop='+mov_w+':'+mov_h+':'+crop_x+':'+crop_y+'')
        .withVideoFilter('setpts=(1*'+speedTransfo+')*PTS')
        .on('end', onRefreshTimelapsEnd)
        .on('error', function(err) { console.log('an error happened: ' + err.message);})
        .saveToFile('public/video/live.mp4');
  };

  function getConfigFile(path){
    var files = glob.sync(path+'/*.yaml');
    if(files.length < 1) return {};
    else return  YAML.load(files[0]);
  }

}
