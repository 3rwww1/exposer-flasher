function init() {

  var socket = io.connect('http://localhost:3001');
  var expo = {}, curCapture = -1, stack = [], conf = {}, interval = 1000/12;

  // io messages
  socket.on('captureStack', onCaptureStack);

  socket.on('newCapture', onNewCapture);
  socket.on('newExpo', onNewExpo)

  // ask for stack on load
  socket.emit('getCaptureStack');


  var loop = setInterval(nextFrame,interval);


  function nextFrame(){
    $('#monitor img:last').after($('#monitor img:first'));
  }

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
    newStack.forEach(function(capture){ onNewCapture(capture); });
  }

  function onNewCapture(capture){
    console.log(capture)
    stack.push(capture);
    var newImage = $('<img>', {id:'i'+stack.length, width:'100%', src:capture, class:'capture'})
    $("#monitor").append(newImage);
  }
};
$(document).on('ready', init);
