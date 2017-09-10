const logger = require('./logger');

//init vars
const streamStats = {
  second : Math.floor(new Date().getTime() / 1000),
  totalSeconds : 0,
  framesPerSecond : 0,
  totalFrames: 0,
  totalFramesForFPS: 0, // Observerd FPS is streamStats.totalFramesForFPS / 5
  currentFPS: 0,
  framesDeltaForFPS: 0,
  ffmpegRestartSuggested: false,
  ffmpegRestartSuggestedCounter: 0,
  lastKnownDelta: 0,
  actualFrames:0

};

exports.getStats = streamStats;

exports.track = function(event){

  const currentSecond = Math.floor(new Date().getTime() / 1000);
  const thisSecond = streamStats.second;

  // This will happen only once every
  if (streamStats.second != currentSecond ){
      if(streamStats.totalSeconds > 0 ){
          streamStats.framesDeltaForFPS = streamStats.framesPerSecond - streamStats.currentFPS;
          logger.log("Second: " + streamStats.second + " captured " + streamStats.framesPerSecond + "/" + streamStats.currentFPS + ". Delta: " + streamStats.framesDeltaForFPS + ". Sent to FFMPEG: " + streamStats.actualFrames + " ." );
      }
      if(streamStats.totalSeconds > 20){
        if (shouldConsiderRestart()){
          logger.log("We should be considering restarting ffmpeg as this delta is too consistent..");
          streamStats.currentFPS = streamStats.currentFPS + streamStats.framesDeltaForFPS;
          streamStats.ffmpegRestartSuggested = true;
        }
      }
      streamStats.totalSeconds++;
      streamStats.second = currentSecond;
      streamStats.framesPerSecond = 0;
      streamStats.actualFrames = 0;
  }

  if( streamStats.totalSeconds > 4 & streamStats.totalSeconds < 10 ){
      streamStats.totalFramesForFPS++;
      streamStats.currentFPS = Math.round(streamStats.totalFramesForFPS / (streamStats.totalSeconds - 4)) ;
  }

  streamStats.framesPerSecond++;
  streamStats.totalFrames++;
}

exports.frameAdded = function(){
  streamStats.actualFrames++
}

exports.frameDropped = function(){
  streamStats.actualFrames--
}

function shouldConsiderRestart(){
  if(streamStats.framesDeltaForFPS == streamStats.lastKnownDelta && streamStats.lastKnownDelta != 0 ){
  //if(streamStats.framesDeltaForFPS == streamStats.lastKnownDelta ){
      streamStats.ffmpegRestartSuggestedCounter++
  }else{
      streamStats.ffmpegRestartSuggestedCounter = 0;
  }
  streamStats.lastKnownDelta = streamStats.framesDeltaForFPS;

  return streamStats.ffmpegRestartSuggestedCounter > 10;
}
