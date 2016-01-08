function init() {

  var socket = io.connect('http://localhost:3000');
  var expo, curStep = 0;

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
    curStep=0;
    updtStep();
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

    console.log('step',curStep);

    var src =  expo.steps[curStep % expo.steps.length];
    var hasFlash = new RegExp('\\bflash\\b');

    if(hasFlash.test(src)) socket.emit('capture');
    else setTimeout(nextStep, expo.interval);

    // image injection
    var newImage = $('<img>', {
      width:'100%',
      src:expo.steps[curStep % expo.steps.length],
      class:'projection'
    })

    $("#projection").prepend(newImage);
    if($("#projection img").length > 1){
      setTimeout(function(){$("#projection img").last().remove();}, expo.conf.capt.interval * 500);
    }
  }


  //
  // utils
  //

};

$(document).on('ready', init);
