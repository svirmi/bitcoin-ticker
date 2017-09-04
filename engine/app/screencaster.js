const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;
const logger = require('./logger');
const pulseaudio = require('./pulseaudio');
const args = require('./arguments');
const stats = require('./stats');
const ffmpegLauncher = require('./ffmpeg');

// We need to work on making this scoped to this instance of the producer
var queue;
var chrome;
var Page;
var Runtime;
var ffmpeg;

exports.start = async function(q) {

  // Set Default Sink
  await pulseaudio.setDefaultSink();

  // Create a new audio sink for this stream
  const sinkId = await pulseaudio.createSink(args.getOutputName());

  //Init chrome
  chrome = await launchChrome();
  logger.log("Chrome started on pid: " + chrome.pid);

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

    // Waiting so we are loading the sound
    await execAsync('sleep 5');

    // GetInputId
    const inputId = await pulseaudio.getInputId(chrome.pid);

    // move input to its corresponding sink
    const moveInputOutput = await pulseaudio.moveInput(inputId, sinkId);

    //Start capturing frames
    await startCapturingFrames();

  });

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
  await Page.navigate({url: url});
}

function onScreencastFrame(event) {

  Page.screencastFrameAck({sessionId: event.sessionId})
  .catch((err) => {
    logger.log("onScreencastAck: ", err);
  });

  //start by updating stats
  stats.track(event);

  //if ffmpeg restart recommended do it now!
  if(stats.getStats.ffmpegRestartSuggested){
    ffmpeg = ffmpegLauncher.restart(stats.getStats.currentFPS, 0, args.getOutputName());
    return;
  }

  // dropping this frame this is too many frames for this second
  if(stats.getStats.framesPerSecond > stats.getStats.currentFPS ){
    logger.log("Dropping this frame..bye bye frame!")
    return;
  }

  const cutoutSecond = 10
  if(stats.getStats.totalSeconds == cutoutSecond && !ffmpeg){
    logger.log("This is the streamStats: " + JSON.stringify(stats.getStats));
    ffmpeg = ffmpegLauncher.start(stats.getStats.currentFPS, args.getAudioOffset(), args.getOutputName());
  }

  if(stats.getStats.totalSeconds > (cutoutSecond + 1) && ffmpeg && ffmpeg.stdin){
    lastImage = new Buffer(event.data, "base64");
    ffmpeg.stdin.write(lastImage);
    while(stats.getStats.framesDeltaForFPS < 0){
        logger.log("Adding extra frame..");
        ffmpeg.stdin.write(lastImage);
        stats.getStats.framesDeltaForFPS++;
    }
  }
}

// Launch Chrome
function launchChrome(headless=true) {
  return chromeLauncher.launch({
    // port: 9222, // Uncomment to force a specific port of your choice.
    chromeFlags: [
      '--window-size=1280,720',
      '--disable-gpu',
      headless ? '--headless' : ''
    ]
  });
}
