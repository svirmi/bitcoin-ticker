const service = require('../services/job')

exports.list = function(req, res){
  const response = service.list();
  res.json(response);
}

exports.create = function(req, res) {
  console.log("jobService::create()");
  const job = req.body;
  const response = service.create(job);
  res.json(response);
}
