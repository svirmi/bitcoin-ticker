const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;
const logger = require('./logger');
const pulseaudio = require('./pulseaudio');
const args = require('./arguments-parser')

// We need to work on making this scoped to this instance of the producer
var queue;
var chrome;
var Page;
var Runtime;

exports.init = async function(q) {
  //Set the queue
  setQueue(q);

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

function setQueue(q){
  queue = q;
  logger.log("Setting producer to use queue: " + queue.name);
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
  if (Page) {
    //Acknowledge screencast
    Page.screencastFrameAck({sessionId: event.sessionId})
    .catch((err) => {
      log("onScreencastAck: ", err);
    });

    //var img = new Buffer(event.data, "base64");
    //logger.log("Adding screenshot to the queue..");
    queue.add({screenshot: event.data, now: new Date()});
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
