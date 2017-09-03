const logger = require('./logger');

//init vars
const streamStats = {
  printStats: true,
  second : new Date(),
  totalSeconds : 0,
  framesPerSecond : 0,
  totalFrames: 0,
  totalFramesForFPS: 0, // Observerd FPS is streamStats.totalFramesForFPS / 5
  currentFPS: 0,
};

exports.track = function(event){

  const currentSecond = new Date();
  if (streamStats.second.toString() != currentSecond.toString() ){
      if(streamStats.printStats && streamStats.totalSeconds > 0 ){
          logger.log("Second at: " + streamStats.second + " has " + streamStats.framesPerSecond + " frames" );
      }
      streamStats.totalSeconds++;
      streamStats.second = currentSecond;
      streamStats.framesPerSecond = 0;

  }

  if( streamStats.totalSeconds > 4 & streamStats.totalSeconds < 10 ){
      streamStats.totalFramesForFPS++;
      streamStats.currentFPS = Math.round(streamStats.totalFramesForFPS / (streamStats.totalSeconds - 4)) ;
  }

  streamStats.framesPerSecond++;
  streamStats.totalFrames++;
}
