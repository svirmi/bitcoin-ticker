const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;
const logger = require('./logger');
const pulseaudio = require('./pulseaudio');
const args = require('./arguments');
const stats = require('./stats');
const ffmpegLauncher = require('./ffmpeg-launcher');

// We need to work on making this scoped to this instance of the producer
var queue;
var chrome;
var Page;
var Runtime;
var ffmpeg;
var lastRestartDateTime = 0;

exports.start = async function() {

  logger.log("Process PID: " + process.pid);

  //TODO: handle the case where chrome is not loaded
  chrome = await loadChrome();
  logger.log("Chrome started on pid: " + chrome.pid);

  //Init pulse audio
  const sinkId = await initPulseAudio();

  //Init remote interface
  const remoteInterface = await initRemoteInterface(chrome);
  remoteInterface.on("Page.screencastFrame", onScreencastFrame);

  //Init Page and Runtime protocols from remote interface
  Page = remoteInterface.Page;
  Runtime = remoteInterface.Runtime;
  await Promise.all([Page.enable(), Runtime.enable()]);

  //Load page
  await loadPage(args.getUrl());

  // Wait for window.onload before start streaming.
  await Page.loadEventFired(async () => {
    logger.log("Page.loadEventFired onload fired");
    await executeAfterPageLoaded(chrome, sinkId);
  });

}

async function loadChrome(){

  try {
    //Init chrome
    logger.log("About to launch Chrome.");
    return await launchChrome();
  }catch(error){
      logger.log("Failed to load chrome for the first time: " + error);
  }

  try {
    //Init chrome
    logger.log("About to launch Chrome for the second time.");
    return await launchChrome();
  }catch(error){
      logger.log("Failed to load chrome for the second time: " + error);
  }
}




async function initPulseAudio(){

  try{
    //Attempt to start pulseaudio deamon
    await pulseaudio.start();

    // Set Default Sink
    await pulseaudio.setDefaultSink();

    // Create a new audio sink for this stream
    return await pulseaudio.createSink(args.getOutputName());

  }catch(error){
    logger.log("Error some how: " + error);
    throw error;
  }
}

async function executeAfterPageLoaded(chrome, sinkId){

  // Waiting so we are loading the sound
  // pushing this further, vimeo take s alot of time to load the audio
  await execAsync('sleep 17');

  // GetInputId
  const inputIdList = await pulseaudio.getInputId(chrome.pid);

  for (i = 0; i < inputIdList.length; i++) {
    var inputId = inputIdList[i];
    // move input to its corresponding sink
    await pulseaudio.moveInput(inputId, sinkId);
  }

  //Start capturing frames
  await startCapturingFrames();

  var params = ffmpegProcessParams(stats.getStats.currentFPS, args.getAudioOffset(), args.getOutputName(), args.getRtmpUrl(), null)
  ffmpeg = ffmpegLauncher.start(params);

}

function initRemoteInterface(chrome){
  const port = chrome.port;
  logger.log("Initialize Remote Interface on port: " + port);
  return ChromeRemoteInterface({port: port});
}

function startCapturingFrames(){
  logger.log("Starting capturing screen frames..");
  return Page.startScreencast({
    format: "jpeg",
    quality: 100,
    //everyNthFrame: 1
  });
}

async function loadPage(url){
  logger.log("Loading page: " + url)
  await Page.navigate({url: url});
}

function onScreencastFrame(event) {

  Page.screencastFrameAck({sessionId: event.sessionId})
  .catch((err) => {
    logger.log("onScreencastAck: ", err);
  });

  //start by updating stats
  stats.track(event);

  if(ffmpeg == null){
    return;
  }

  // dropping this frame this is too many frames for this second
  if(stats.getStats.framesToAddNow == 0 ){
    return;
  }

  // //if ffmpeg restart recommended do it now if possible or wait until 10 seconds later
  const nextRestart = lastRestartDateTime + 10000; //10 seconds later
  const newRestartDateTime = new Date().getTime();
  if(stats.getStats.ffmpegRestartSuggested && nextRestart < newRestartDateTime){
    lastRestartDateTime = newRestartDateTime;
    stats.getStats.ffmpegRestartSuggested = false;
    stats.getStats.ffmpegRestartSuggestedCounter = 0;
    stats.resetSmoothingAlgoStats();
    var params = ffmpegProcessParams(stats.getStats.currentFPS, 0, args.getOutputName(), args.getRtmpUrl(), ffmpegSet);
    ffmpeg = ffmpegLauncher.restart(params);
    return;
  }

  // send the frame to ffmpeg
  if(ffmpeg && ffmpeg.stdin){
    stats.getStats.ffmpegReady = true;
    lastImage = new Buffer(event.data, "base64");
    //sync av by adding missing frames
    while(stats.getStats.framesToAddNow > 0){
        //logger.log("Adding extra frame..");
        ffmpeg.stdin.write(lastImage);
        stats.getStats.framesDeltaForFPS++;
        stats.frameAdded();
    }
  }
}

function ffmpegProcessParams(f, af, on, ru, cb){
  const params = {
    fps: f,
    audioOffset: af,
    outputName: on,
    rtmpUrl: ru,
    callback: cb
  }
  return params;
}

function ffmpegSet(f){
  ffmpeg = f;
}

// Launch Chrome
function launchChrome(headless=true) {
  return chromeLauncher.launch({
    startingUrl: args.getUrl(),
    chromeFlags: ['--window-size=1280,720','--headless', '--disable-gpu']
  });
}
