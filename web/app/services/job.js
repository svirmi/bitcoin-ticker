



exports.list = function (){
  return "This is the response from this method Job::List()";
}

exports.create = function(job){
  console.log("Starting a screencast-producer");
  console.log("Starting a queue");
  console.log("starting a screencast-consumer")
  return `We have scheduled a job to screencast this url: ${job.url}`;
}
