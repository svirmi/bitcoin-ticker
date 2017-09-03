// Init the original Screencaster, this is being kept in here for refeenced
// const Screencaster = require('./app/screencaster-original');
// Screencaster.start());

// This is the implementation we wanted to explore
const Queue = require('bull');
const queue = new Queue('screencastQueue', 'redis://127.0.0.1:6379');
const producer = require("./app/producer")
const ffmpegStarter = require('./app/ffmpeg')
const args = require('./app/arguments-parser')
const stats = require('./app/stats')

var ffmpeg;
var lastImage;

producer.init(queue);

const consumer = async function readQueue(){
  if(!ffmpeg){
    return;
  }

  const count = await queue.count();

  if(count > 0){
      var next = await queue.getNextJob();
      var lastImage = new Buffer(next.data.screenshot, "base64");
      ffmpeg.stdin.write(lastImage);
      // cleaning queue
      await queue.empty();
  }else if(lastImage){
      // if the count is 0 and we have an image we will duplicate it
      logger.log("Duplicating an image..")
      ffmpeg.stdin.write(lastImage);
  }
  stats.track("");
}

// We want to set a 25 FPS rate so we need to grab screenshot from the queue every
// 40ms
const consumerStarter = function startConsumer(){
    setInterval(consumer, 39);
    ffmpeg = ffmpegStarter.start(25, args.getAudioOffset(), args.getOutputName());
}

// Start the consumer after 7 seconds
setTimeout(consumerStarter, 10000)
