// IMPORTANT READ!
// Audio works once we disable the disabling of the Audio
// from here: /Users/sebap/git/empirical/bullman-experiments/bullman/node_modules/chrome-launcher/flagscreencast.js

// Chrome Dev Tools: https://chromedevtools.github.io/devtools-protocol/

const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;


//Examples of perfectly aligned videoSpeed
// node screencast.js "https://www.youtube.com/watch?v=0pdCW9-eiVU" -2 experiment // 30fps
// node screencast.js "https://www.youtube.com/watch?v=szoOsG9137U" -2 experiment // 30fps
// node screencast.js "https://www.youtube.com/watch?v=X_gnyJeVr28" -2 experiment // 30fps
// node screencast.js "https://www.youtube.com/watch?v=KWh9YLtbbws" -2 experiment // 30fps
// node screencast.js "https://www.youtube.com/watch?v=R1_VNTdRJNI" -2 experiment // 30fps
// node screencast.js "https://www.youtube.com/watch?v=-G30tD8sPuw" -2 experiment // 30fps
// node screencast.js "https://www.youtube.com/watch?v=wAVzKY-u-ac" -2 experiment // 25fps
// node screencast.js "https://www.youtube.com/watch?v=5-prFsuWdqs" -2 experiment // 25fps
// node screencast.js "https://www.youtube.com/watch?v=Z32qL2MRkJM" -2 experiment // 24fps


// node screencast.js "https://www.youtube.com/watch?v=-G30tD8sPuw" -2 experiment2



// This is what I have learnt so far. It seems that there are videos that are recorded at 25fps and at 30fpms
// It seems that when we capture at 30fps we need to speed up the playback and when
// we capture at 25fps we need to play it back a normal speed.
// we can learn about this by looking into the video and analizing whats the rate
// what we need to find out is how we can make it so that is is being done
// at ffmpeg level and there is no problem with it

// Mathematically
// Streams recorded at 30 fps are shown at a rate of 1 frame every 33 ms ( 121.212121 faster than 25fps )
// Streams recorded at 25 fps are shown at a rate of 1 frame every 40 ms

// In other words in order to achieve the same speed we need to accelarate teh 30fps
// by an inverse factor of 0.825, hence the property "setpts=0.825*PTS"
// but adjusted for some reason we need to use "setpts=0.835*PTS"

// This value is derived from the inverse relation of
// 33ms => 100
// 40ms => x
// x = (33 * 100) / 40 = 82.5

// We do not have support for 24fps, and if there is any video recorded at
// 24fps we will not work and will look choppy but we can fix it need more time

// call this
exports.start = async function() {

  // Set Default Sink
  // It is located under /etc/pulse/default.pa
  // load-module module-stream-restore restore_device=false
  await setDefaultSink();

  var args = process.argv.slice(2);
  var url = getUrl(args); // 0 "http://urltoberecorded.com/index.html"
  var audioOffset = getAudioOffset(args); // 1 - i.e: 1.0
  var outputName = getOutputName(args); // 3 - i.e: "experiment"
  var ffmpeg;
  var lastImage;

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




  //Init chrome
  const chrome = await launchChrome();
  log("Chrome started on pid: " + chrome.pid);

  //Init remote interface
  const remoteInterface = await initRemoteInterface(chrome);
  remoteInterface.on("Page.screencastFrame", onScreencastFrame);

  // initialize Page and Runtime protocols from remote interface
  const {Page, Runtime} = remoteInterface;
  await Promise.all([Page.enable(), Runtime.enable()]);

  // Create a new audio sink for this stream
  const sinkId = await createSink(outputName);

  await loadPage(url);

  // Wait for window.onload before start streaming.
  await Page.loadEventFired(async () => {

    // Waiting so we are loading the sound
    await execAsync('sleep 5');

    const inputId = await getInputId(chrome.pid);

    // move input to its corresponding sink
    const moveInputOutput = await moveInput(inputId, sinkId);

    //Start capturing frames
    await startCapturingFrames();

  });

  //****************************************************************************
  // Functions beyond this
  //****************************************************************************

  function getUrl(args){
    log("Working on url:" + args[0]);
    if(args[0] === undefined || args[0] === ""){
      log("Exiting url is not defined in the params");
      process.exit(1);
    }
    return args[0];
  }

  function getAudioOffset(args){
    log("Audio offset of:" + args[1]);
    if(args[1] === undefined || args[1] === ""){
      log("Exiting offset is not defined in the params");
      process.exit(1);
    }
    return args[1];
  }

  function getOutputName(args){
    log("Output Name of:" + args[2]);
    if(args[2] === undefined || args[2] === ""){
      log("Exiting, output name is not defined in the params");
      process.exit(1);
    }
    return args[2];
  }

  function initRemoteInterface(chrome){
    const port = chrome.port;
    log("Initialize Remote Interface on port: " + port);
    return ChromeRemoteInterface({port: port});
  }


  function startCapturingFrames(){
    log("Starting capturing screen frames..");
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

      Page.screencastFrameAck({sessionId: event.sessionId})
      .catch((err) => {
        log("onScreencastAck: ", err);
      });

      const fps = trackStats(event);
      if(fps > streamStats.currentFPS ){
          // do not send if it is above the threshold
          log("Dropping this frame..")
          return;
      }

      const cutoutSecond = 10
      if(streamStats.totalSeconds == cutoutSecond && !ffmpeg){
        log("This is the streamStats: " + JSON.stringify(streamStats));
        // log("Disabling stats printing...");
        // streamStats.printStats = false;
        ffmpegStart(streamStats.currentFPS);
      }

      if(streamStats.totalSeconds > (cutoutSecond + 1) && ffmpeg && ffmpeg.stdin){
        lastImage = new Buffer(event.data, "base64");
        ffmpeg.stdin.write(lastImage);
        while(streamStats.framesDeltaForFPS < 0){
            log("Adding extra frame..");
            ffmpeg.stdin.write(lastImage);
            streamStats.framesDeltaForFPS++;
        }
      }
    }
  }

  function trackStats(event){

    const currentSecond = new Date();
    if (streamStats.second.toString() != currentSecond.toString() ){
        if(streamStats.printStats && streamStats.totalSeconds > 0 ){
            streamStats.framesDeltaForFPS = streamStats.framesPerSecond - streamStats.currentFPS;
            log("Second at: " + streamStats.second + " has " + streamStats.framesPerSecond + " frames. Delta: " + streamStats.framesDeltaForFPS );
        }
        if(streamStats.totalSeconds > 20){
          if (Math.abs(streamStats.framesDeltaForFPS) > 5){
            log("We should be considering restarting ffmpeg as this delta is too high..");
            streamStats.currentFPS = streamStats.currentFPS + streamStats.framesDeltaForFPS;
            ffmpegRestart(streamStats.currentFPS);
          }
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
    return streamStats.framesPerSecond;
  }

  function closeAll(){
    remoteInterface.close();
    chrome.kill();
    log("Closing all");
  }

  function ffmpegRestart(fps){
    audioOffset = 0;
    ffmpeg.stdin.pause();
    ffmpeg.kill();
    ffmpegStart(fps);
  }

  // Start ffmpeg via spawn
  async function ffmpegStart(fps){

    log("Initializing FFMPEG....");
    log("Initializing FFMPEG with FPS: " + fps);

    const ops = ffmpegOpts(fps, audioOffset, outputName)
    ffmpeg = spawn('ffmpeg', ops, { stdio: [ 'pipe', 'pipe', 2 ] } );
    ffmpeg.on('error',function(e){
      log('child process error' + e);
      closeAll();
    });
    ffmpeg.on('close', (code, signal) => {
      log( "child process terminated due to receipt of signal ${signal}");
      closeAll();
    });
  }

  function ffmpegOpts(fps, audioOffset, outputName){
    const ops=[
      //"-debug_ts",

      //Input 0: Audio
      '-thread_queue_size', '1024',
      '-itsoffset', audioOffset,
      //'-r', '25',
      //'-i', 'http://www.jplayer.org/audio/m4a/Miaow-07-Bubble.m4a',
      '-f', 'pulse', '-i', outputName + ".monitor",
      '-acodec', 'aac',

      // Input 1: Video
      '-thread_queue_size', '1024',
      '-framerate', fps,
      '-vsync', '1',
      //'-ss', offset,
      '-i', '-', '-f', 'image2pipe', '-c:v', 'libx264', '-preset', 'veryFast', //'-tune', 'zerolatency',
      '-pix_fmt', 'yuvj420p',

      // Output
      // '-async', '1',
      '-vsync', 'cfr',
      // '-af', 'aresample=async=1000',
      // This is to speed up video 0.5 double speed, 2.0 half as slow
      //'-filter:v', videoSpeed,
      //'-filter:v', 'fps=fps=25',
      //This is to slow down audio, but audio is always good, no need this
      //'-filter:a', 'aresample=async=1', // no effect detected maybe we need buffer. it is causing sometimes to fail
      //'-shortest',
      '-r', fps,
      '-threads', '0',
      //'-f', 'mp4', 'recording.mp4'
      '-c:a', 'aac', '-strict', '-2',
      '-f', 'flv', "rtmp://stream-staging.livepin.tv:1935/live/" + outputName
    ];
    return ops;
  }

  async function createSink(sinkName) {
    var sinkId = await readSinkId(sinkName)

    if(sinkId){
      log("Existing Sink id: " + sinkId)
      return sinkId;
    }
    await execAsync('pactl load-module module-null-sink sink_name=' + sinkName + ' sink_properties=device.description=' + sinkName);

    sinkId = await readSinkId(sinkName);
    log("New Sink id: " + sinkId);
    return sinkId;
  }

  async function readSinkId(sinkName){
    const {stdout} = await execAsync('pactl list short sinks | grep ' + sinkName + '| cut -f1');
    const sinkId = stdout.trim();
    return sinkId;
  }

  async function setDefaultSink(){
    log("Setting default sink to 'Default'");
    const defaultSink = "Default";
    const defaultSource = defaultSink +".monitor";
    await createSink(defaultSink);
    await execAsync('pacmd set-default-sink ' + defaultSink);
    const {stdout} = await execAsync('pacmd set-default-source ' + defaultSource);
    const setDefaultOutput = stdout.trim();
    return setDefaultOutput;
  }

  async function getInputId(chromePid) {
    const {stdout} = await execAsync('./scripts/get_input_index.sh ' + chromePid);
    const inputId = stdout.trim();
    log("Input id: " + inputId);
    return inputId;
  }

  async function moveInput(inputId, sinkId) {
    log("Moving Input id: " + inputId + " to Sink id: " + sinkId);
    const {stdout} = await execAsync('pacmd move-sink-input ' + inputId + ' ' + sinkId);
    const output = stdout.trim();
    return output;
  }

  function log(message){
    console.log( "[Bullman] " + message );
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

}
