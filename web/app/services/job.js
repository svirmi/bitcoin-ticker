const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const terminate = require('terminate');
const http = require('./http')
const logger = require('../logger');
const db = {};

exports.list = function (){
  return "This is the response from this method Job::List()";
}

exports.create = async function(job){
  logger.log("Starting a screencaster job");
  try {
    const ops = getScreencasterOpts(job);
    screencaster = spawn('node', ops, { stdio: [ 'pipe', 'pipe', 2 ], cwd: "../engine"} );
    logger.log("Process Pid: " + screencaster.pid);
    db[screencaster.pid] = terminateJob(screencaster.pid); // kill process in 1 hour if it is not stopped earlier
  }catch(err){
    logger.log("Failed badly to start the process " + err);
    return err;
  }
  job.jobId = screencaster.pid;
  job.hostUrl = await http.getInstanceIp();;
  return job;
}

function getScreencasterOpts(job){
  const options = [
    '../engine/index.js',
    job.url, // url to screencast
    '0', // audio offset
    job.outputName, // output name
    job.rtmpUrl //rtmp url
  ];
  return options;
}

function terminateJob(pid){
  return setTimeout(function(){
    terminate(pid, function (err) {
      if (err) { // you will get an error if you did not supply a valid process.pid
        logger.log("Oopsy, the pid was not found:" + err); // handle errors in your preferred way.
      }
      else {
        logger.log('Closing job by timeout'); // terminating the Processes succeeded.
      }
    })
  }, 3600000);
}

exports.stop = function(jobId){
  terminate(jobId, function (err) {
    if (err) { // you will get an error if you did not supply a valid process.pid
      logger.log("Oopsy: " + err); // handle errors in your preferred way.
    }
    else {
      logger.log('Closing job by invoking the stop endpoint'); // terminating the Processes succeeded.
    }
  });
  //make sure we cancel the timeout
  clearTimeout(db[jobId]);
  return "ok";
}
