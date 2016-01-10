function init() {

  var socket = io.connect('http://localhost:3000');
  var expo, curStep, startTime = new Date().getTime();;

  socket.on('imageStack', onImageStack);


  socket.emit('getImageStack');

  function onImageStack(data){
    console.log('data', data);
  }


  function injectImg(){
    var newImage = $('<img>', {
      width:'100%',
      src:expo.steps[curStep % expo.steps.length],
      class:'projection'
    })
    $("#projection").prepend(newImage);
  }


};

$(document).on('ready', init);
