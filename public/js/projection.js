function init() {

  var socket = io.connect('http://localhost:3000')
    $nega = $("#nega");

  socket.on('newExpo', onNewExpo)
  socket.on('step', setStep)

  var expo;

  function onNewExpo(data){

    expo = data;
    setStep(0);

    console.log(expo);

    // var i =0;
    // setInterval(function(){

    //   i++;
    //   setStep(i);

    // }, expo.conf.expo.duration * 1000)
  }



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


  //Délai de sécurité en ms
  var delayExposure = 250;

  //sockets
  socket.on('connect', onSocketConnect);

  // functions
  function reloadNega(){
    $nega.attr("src","/images/nega.png?reload="+Math.round((new Date()).getTime() / 1000)).load();
  }
  function expose(){
    setTimeout(function(){
      $nega.removeClass("off");
    },delayExposure);
  }
  function flash(){
    $nega.addClass("off");
  }

  function onSocketConnect() {
    console.log('Connected');
    //socket.emit('newUser', {name: $('#name').val()});
  };
  function onSeanceEnd(){
    setTimeout(function(){
       $nega.addClass("off");
      },5000);
  };

  socket.on('expose_stop', onSeanceEnd);

  // shortcuts
  $(document).keypress(function( event ){
    // console.log(event.which);
    if ( event.which == 101 ) expose();       //e -> expose
    if ( event.which == 102 ) flash();        //f -> flash
    if ( event.which == 114 ) reloadNega();   //r -> reload
  });

  // reset();
};
$(document).on('ready', init);
