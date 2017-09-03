// Init the original Screencaster, this is being kept in here for refeenced
const Screencaster = require('./app/screencaster-original');
Screencaster.start();

// // This is the implementation we wanted to explore
// const Queue = require('bull');
// const producer = require("./app/producer");
// const ffmpegStarter = require('./app/ffmpeg');
// const args = require('./app/arguments-parser');
// const stats = require('./app/stats');
// const logger = require('./app/logger');
//
// var ffmpeg;
// var lastImage;
//
// const queue = new Queue(args.getOutputName(), 'redis://127.0.0.1:6379');
// queue.empty();
// producer.init(queue);
//
// const consumer = async function readQueue(F){
//   if(!ffmpeg){
//     return;
//   }
//
//   const fps = stats.track("");
//   // exit if the amount of frames is larger than 25 per second
//   if(fps > 25){
//     await queue.empty();
//     return;
//   }
//
//   try{
//     const count = await queue.count();
//
//     if(count > 0){
//         var next = await queue.getNextJob();
//         var lastImage = new Buffer(next.data.screenshot, "base64");
//         ffmpeg.stdin.write(lastImage);
//         next.done();
//     }else if(lastImage){
//         // if the count is 0 and we have an image we will duplicate it
//         logger.log("Duplicating an image..")
//         ffmpeg.stdin.write(lastImage);
//     }
//
//     await queue.empty();
//
//   }catch(err){
//     logger.log("Failed on processing the frame " + err)
//   }
// }
//
// // We want to set a 25 FPS rate so we need to grab screenshot from the queue every
// // 40ms
// const consumerStarter = function startConsumer(){
//     setInterval(consumer, 40);
//     ffmpeg = ffmpegStarter.start(25, args.getAudioOffset(), args.getOutputName());
// }
//
// // Start the consumer after 7 seconds
// setTimeout(consumerStarter, 7000)
