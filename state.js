var Baobab = require('baobab'),
    monkey = Baobab.monkey;

var tree = new Baobab({
  captureEnable:null,
  captureReady:'',
  program:[],
  expo:{
    id:0,
    data: monkey(
      ['expo', 'id'],
      ['program'],
      function(id, program) {
        return program[id] || null;
      }
    ),
    capturePath:__dirname+'/content/',
    captureStack:[]
  }
});

module.exports = tree;
