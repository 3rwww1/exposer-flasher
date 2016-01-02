var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/projection/', function(req, res, next) {
  res.render('projection', { title: 'projection' });
});

module.exports = router;
