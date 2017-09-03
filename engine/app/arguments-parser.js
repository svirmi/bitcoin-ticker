const logger = require('./logger');

var args = process.argv.slice(2);
var url = getUrl(args); // 0 "http://urltoberecorded.com/index.html"
var audioOffset = getAudioOffset(args); // 1 - i.e: 1.0
var outputName = getOutputName(args); // 3 - i.e: "experiment"


function getUrl(){
  logger.log("Working on url:" + args[0]);
  if(args[0] === undefined || args[0] === ""){
    logger.log("Exiting url is not defined in the params");
    process.exit(1);
  }
  return args[0];
}
exports.getUrl = getUrl;

function getAudioOffset(){
  logger.log("Audio offset of:" + args[1]);
  if(args[1] === undefined || args[1] === ""){
    logger.log("Exiting offset is not defined in the params");
    process.exit(1);
  }
  return args[1];
}
exports.getAudioOffset = getAudioOffset;

function getOutputName(){
  logger.log("Output Name of:" + args[2]);
  if(args[2] === undefined || args[2] === ""){
    logger.log("Exiting, output name is not defined in the params");
    process.exit(1);
  }
  return args[2];
}

exports.getOutputName = getOutputName;
