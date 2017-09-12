const execAsync = require('async-child-process').execAsync;
const spawn = require('child_process').spawn;

exports.list = function (){
  return "This is the response from this method Job::List()";
}

exports.create = function(job){
  console.log("Starting a job");
  try {
    //response = spawn("node ../engine/index.js 'https://www.youtube.com/watch?v=5-prFsuWdqs' 0 awesomeness");
    const ops = getOpts(job);
    screencaster = spawn('node', ops, { stdio: [ 'pipe', 'pipe', 2 ], cwd: "../engine"} );
  }catch(err){
    console.log("Failed badly to start the process " + err);
    return err;
  }
  return `We have scheduled a job to screencast this url: ${job.url}`;
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
