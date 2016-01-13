function init() {

  var socket = io.connect('http://localhost:3001');
  var expo, curStep, conf, startTime;

  //
  // socket events
  //
  socket.on('newExpo', onNewExpo)
  socket.on('captureEnd', nextStep)
  socket.emit('getNewExpo');

  //
  // events handlers
  //
  function onNewExpo(data){
    expo = data;
    conf = expo.conf;

    curStep=-1;
    startTime = new Date().getTime();

    nextStep();

    console.log(expo);
  }

  //
  // actions
  //

  function nextStep(){
    // ask for new exposition if time is over
    if(getDuration() > conf.duration){
      $("#projection").empty();
      setTimeout(function(){socket.emit('getNewExpo')}; 3000);
    }else{
      curStep++;
      updtStep();
    }
  }

  function updtStep(){

    console.log('step',curStep, conf.duration, getDuration());

    var src = expo.steps[curStep % expo.steps.length];

    // check if current image needs capture
    var hasFlash = new RegExp('\\bflash\\b');
    if(hasFlash.test(src)) socket.emit('capture');
    else setTimeout(nextStep, conf.interval);

    // inject current image
    injectImg();

  }

  function injectImg(){
    var newImage = $('<img>', {
      width:'100%',
      src:expo.steps[curStep % expo.steps.length],
      class:'projection'
    })

    $("#projection").prepend(newImage);

    if($("#projection img").length > 1){
      setTimeout(function(){$("#projection img").last().remove();}, conf.interval/2);
    }
  }

  function getDuration(){
    var now = new Date().getTime();
    return (now-startTime);
  }
  //
  // utils
  //

};

$(document).on('ready', init);
