function init() {

  var socket = io.connect('http://localhost:3000');
  var expo;

  //
  // socket events
  //
  socket.on('newExpo', onNewExpo)
  socket.on('step', setStep)
  socket.on('test', function(data){
    console.log(data);
  })

  socket.on('flash', onFlash);

  //
  // events handlers
  //
  function onNewExpo(data){
    expo = data;
    setStep(0);
    console.log(expo);
  }

  function onFlash(state){
    console.log(state);
  }

  //
  // actions
  //
  function setStep(i){
    console.log('step',i)
    var newImage = $('<img>', {
      width:'100%',
      src:expo.steps[i % expo.steps.length],
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
