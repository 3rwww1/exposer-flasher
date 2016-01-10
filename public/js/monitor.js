function init() {

  var socket = io.connect('http://localhost:3000');
  var expo = {}, curCapture = -1, stack = [], conf = {}, interval = 1000/12;

  // io messages
  socket.on('captureStack', onCaptureStack);
  socket.on('newExpo', onNewExpo)

  // ask for stack on load
  socket.emit('getCaptureStack');

  //
  function onNewExpo(data){
    expo = data;
    conf = expo.conf;
    interval = 1000/conf.monitorFPS;

    console.log(conf, interval);
  }

  function onCaptureStack(newStack){
    stack = newStack;
    console.log(stack.length,'captures in stack');

    setInterval(function(){
      curCapture ++ ;
      injectImg();
    },interval);
  }

  function injectImg(){
    var newImage = $('<img>', {
      width:'100%',
      src:stack[curCapture % stack.length],
      class:'capture'
    })
    $("#monitor").append(newImage);

    if($("#monitor img").length > 1){
      setTimeout(function(){$("#monitor img").first().remove();}, interval/2);
    }
  }
};

$(document).on('ready', init);
