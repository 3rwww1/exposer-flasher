function init() {

  var socket = io.connect('http://localhost:3000');
  var expo, curStep, startTime = new Date().getTime();;

  //
  // socket events
  //
  socket.on('newExpo', onNewExpo)
  socket.on('captureEnd', nextStep)

  //
  // events handlers
  //
  function onNewExpo(data){
    expo = data;
    conf = expo.conf;

    curStep=-1;
    nextStep();

    console.log(expo);
  }

  //
  // actions
  //

  function nextStep(){
    curStep++;
    updtStep();
  }

  function updtStep(){



    console.log('step',curStep, conf.duration, getDuration());

    if(getDuration() > conf.duration){
      socket.emit('expoEnd');
    }

    var src =  expo.steps[curStep % expo.steps.length];
    var hasFlash = new RegExp('\\bflash\\b');

    if(hasFlash.test(src)) socket.emit('capture');
    else setTimeout(nextStep, conf.interval);

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
