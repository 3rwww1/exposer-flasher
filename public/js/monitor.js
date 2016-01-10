function init() {

  var socket = io.connect('http://localhost:3000');
  var expo, curCapture = -1, stack;

  socket.on('captureStack', onCaptureStack);


  socket.emit('getCaptureStack');

  function onCaptureStack(data){
    stack = data;
    console.log(stack);
  }

  var interval = 40;

  setInterval(function(){
    curCapture ++ ;
    injectImg();
  },interval);

  function injectImg(){
    var newImage = $('<img>', {
      width:'100%',
      src:stack[curCapture % stack.length],
      class:'capture'
    })
    $("#monitor").prepend(newImage);

    if($("#monitor img").length > 1){
      setTimeout(function(){$("#monitor img").last().remove();}, interval/2);
    }
  }

};

$(document).on('ready', init);
