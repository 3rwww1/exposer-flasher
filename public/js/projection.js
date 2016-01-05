function init() {

  var socket = io.connect('http://localhost:3000');
  var expo, curStep = 0;

  //
  // socket events
  //
  socket.on('newExpo', onNewExpo)
  socket.on('step', updtStep)
  socket.on('captureEnd', onCaptureEnd)
  socket.on('test', function(data){
    console.log(data);
  })

  socket.on('flash', onFlash);

  //
  // events handlers
  //
  function onNewExpo(data){
    expo = data;
    curStep=0;
    updtStep();
    console.log(expo);
  }

  function onFlash(state){
    console.log(state);
  }


  function onCaptureEnd(){
    nextStep();
  }
  //
  // actions
  //

  function nextStep(){

    curStep++;
    updtStep();

  }

  function updtStep(){
    console.log('step',curStep)
    var src =  expo.steps[curStep % expo.steps.length];

    var hasFlash = new RegExp('\\bflash\\b');

    if(hasFlash.test(src)) {
      console.log('it is a flash !');
      socket.emit('capture');
    }else{
      setTimeout(nextStep, 4000);
    }

    var newImage = $('<img>', {
      width:'100%',
      src:expo.steps[curStep % expo.steps.length],
      class:'projection'
    })

    $("#projection").prepend(newImage);

    if($("#projection img").length > 1){
      setTimeout(function(){
        $("#projection img").last().remove();
      }, expo.conf.capt.interval * 500);
    }
  }

  //
  // utils
  //

};

$(document).on('ready', init);
