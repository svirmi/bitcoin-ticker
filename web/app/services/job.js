const execAsync = require('async-child-process').execAsync;
const spawn = require('child_process').spawn;
const terminate = require('terminate');

const db = {};

exports.list = function (){
  return "This is the response from this method Job::List()";
}

exports.create = function(job){
  console.log("Starting a screencaster job");
  try {
    //response = spawn("node ../engine/index.js 'https://www.youtube.com/watch?v=5-prFsuWdqs' 0 awesomeness");
    const ops = getOpts(job);
    screencaster = spawn('node', ops, { stdio: [ 'pipe', 'pipe', 2 ], cwd: "../engine"} );
    console.log("Process Pid: " + screencaster.pid);
    db[screencaster.pid] = setTimeout(function(){
      terminate(screencaster.pid, function (err) {
        if (err) { // you will get an error if you did not supply a valid process.pid
          console.log("Oopsy, the pid was nto found: " + err); // handle errors in your preferred way.
        }
        else {
          console.log('CLosing job by timeout'); // terminating the Processes succeeded.
        }
      })
    //}, 3600000); // kill process in 1 hour if it is not stopped earlier
  }, 60000);
  }catch(err){
    console.log("Failed badly to start the process " + err);
    return err;
  }
  job.jobId = screencaster.pid;
  return job;
}

function getOpts(job){
  const options = [
    '../engine/index.js',
    job.url, // url to screencast
    '0', // audio offset
    job.outputName // output name
  ];
  return options;
}

exports.stop = function(jobId){
  terminate(jobId, function (err) {
    if (err) { // you will get an error if you did not supply a valid process.pid
      console.log("Oopsy: " + err); // handle errors in your preferred way.
    }
    else {
      console.log('CLosing job by invoking the stop endpoint'); // terminating the Processes succeeded.
    }
  });
  //make sure we cancel the timeout
  clearTimeout(db[jobId]);
  return "ok";
}
