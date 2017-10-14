const logger = require('./logger');

var args = process.argv.slice(2);

function getUrl(){
  const url = args[0];
  logger.log("Working on url: " + url);
  if(url === undefined || url === ""){
    logger.log("Exiting url is not defined in the params");
    process.exit(1);
  }
  return url;
}
exports.getUrl = getUrl;

function getAudioOffset(){
  const audioOffset = args[1];
  logger.log("Audio offset of: " + audioOffset);
  if(audioOffset == null || audioOffset === ""){
    logger.log("Exiting offset is not defined in the params");
    process.exit(1);
  }
  return audioOffset;
}
exports.getAudioOffset = getAudioOffset;

function getOutputName(){
  const outputName = args[2];
  logger.log("Output Name of: " + outputName);
  if(outputName == null || outputName === ""){
    logger.log("Exiting, output name is not defined in the params");
    process.exit(1);
  }
  return outputName;
}

exports.getOutputName = getOutputName;

function getRtmpUrl(){
  const rtmpUrl = args[3];
  logger.log("Rtmp Url: " + rtmpUrl );
  if(rtmpUrl == null || rtmpUrl === ""){
    logger.log("Exiting, rtmp url is not defined in the params");
    process.exit(1);
  }
  return rtmpUrl;
}

exports.getRtmpUrl = getRtmpUrl;
