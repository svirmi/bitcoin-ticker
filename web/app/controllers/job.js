const service = require('../services/job')
const logger = require('../logger');

exports.list = function(req, res){
  const response = service.list();
  res.json(response);
}

exports.create = async function(req, res) {
  logger.log("jobService::create()");
  const job = req.body;
  const response = await service.create(job);
  logger.log("This is the response: " + JSON.stringify(response));
  res.json(response);
}

exports.stop = function(req, res) {
  const jobId = req.params.id;
  const response = service.stop(jobId);
  logger.log("This is the response: " + response)
  res.json(response);
}
