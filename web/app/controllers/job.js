const service = require('../services/job')



exports.list = function(req, res){
  const response = service.list();
  res.json(response);
}

exports.create = function(req, res) {
  console.log("jobService::create()");
  const job = req.body;
  const response = service.create(job);
  console.log("This is the response: " + JSON.stringify(response));
  res.json(response);
}


exports.stop = function(req, res) {
  const jobId = req.params.id;
  const response = service.stop(jobId);
  console.log("This is the response: " + response)
  res.json(response);
}
