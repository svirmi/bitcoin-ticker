// IMPORTANT READ!
// Audio works once we disable the disabling of the Audio
// from here: /Users/sebap/git/empirical/bullman-experiments/bullman/node_modules/chrome-launcher/flags.js

// Chrome Dev Tools: https://chromedevtools.github.io/devtools-protocol/

const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const spawn = require('child_process').spawn;


//Examples of perfectly aligned videoSpeed
// 1 - With offset and video speed up
// node s.js "https://www.youtube.com/watch?v=R1_VNTdRJNI" 0.45 "setpts=0.835*PTS"
// node s.js "https://www.youtube.com/watch?v=-G30tD8sPuw" 0.45 "setpts=0.835*PTS"

// 2 - With larger offset but NO speed up
//node s.js "https://www.youtube.com/watch?v=wAVzKY-u-ac" 1 "setpts=1*PTS"

// 3 - With even larger offset HD
//node s.js "https://www.youtube.com/watch?v=5-prFsuWdqs" 2 "setpts=1*PTS"

// call this
(async function() {

  var args = process.argv.slice(2);
  var url = getUrl(args); // 0 "http://urltoberecorded.com/index.html"
  var audioOffset = getAudioOffset(args); // 1 - i.e: 1.0
  var videoSpeed = getVideoSpeed(args); // 2 - i.e:" setpts=0.832*PTS

  //init vars
  var streamStats = {};
  streamStats.second = new Date();
  var frameCount = 0;
  var ffmpeg;

  //Init chrome
  const chrome = await launchChrome();

  //Init remote interface
  const remoteInterface = await initRemoteInterface(chrome);
  remoteInterface.on("Page.screencastFrame", onScreencastFrame);

  // initialize Page and Runtime protocols from remote interface
  const {Page, Runtime} = remoteInterface;
  await Promise.all([Page.enable(), Runtime.enable()]);

  await loadPage(url);

  // Wait for window.onload before start streaming.
  await Page.loadEventFired(async () => {

    //Start capturing frames
    await startCapturingFrames();

    //initialize ffmpeg
    startStreaming();

  });

  //****************************************************************************
  // Functions beyond this
  //****************************************************************************

  function getUrl(args){
    console.log("Working on url:" + args[0]);
    if(args[0] === undefined || args[0] === ""){
      console.log("Exiting url is not defined in the params");
      process.exit(1);
    }
    return args[0];
  }

  function getAudioOffset(args){
    console.log("Audio offset of:" + args[1]);
    if(args[1] === undefined || args[1] === ""){
      console.log("Exiting offset is not defined in the params");
      process.exit(1);
    }
    return args[1];
  }

  function getVideoSpeed(args){
    console.log("Video Speed of:" + args[2]);
    if(args[2] === undefined || args[2] === ""){
      console.log("Exiting video speed is not defined in the params");
      process.exit(1);
    }
    return args[2];
  }

  function initRemoteInterface(chrome){
    const port = chrome.port;
    console.log("Initialize Remote Interface on port: " + port);
    return ChromeRemoteInterface({port: port});
  }


  function startCapturingFrames(){
    console.log("Starting capturing screen frames..");
    return Page.startScreencast({
      format: "jpeg",
      quality: 100,
      everyNthFrame: 1
    });
  }

  async function loadPage(url){
    await Page.navigate({url: url});
  }


  function onScreencastFrame(event) {
    // var currentSecond = new Date();
    // if (streamStats.second.toString() != currentSecond.toString() ){
    //     console.log("Second at: " + streamStats.second + " has " + streamStats.count + " frames" );
    //     streamStats.second = currentSecond;
    //     streamStats.count = 0;
    // }
    // streamStats.count++;
    frameCount++;

    if (Page) {
      // console.log(event.sessionId);
      //console.log( "Event SessionId: " + event.sessionId + " Medatada: " + JSON.stringify (event.metadata) );
      //console.log( "Event Data: " + event.data );
      Page.screencastFrameAck({sessionId: event.sessionId})
      .catch((err) => {
        console.log("onScreencastAck: ", err);
      });


      if(frameCount == 1){
        console.log("Just captured first frame to be sent to FFMPEG.");
      }

      if(ffmpeg && ffmpeg.stdin){
        var img = new Buffer(event.data, "base64");
        ffmpeg.stdin.write(img);
      }else{
        console.log("ffmpeg not ready yet..");
      }

    }
  }

  function closeAll(){
    remoteInterface.close();
    chrome.kill();
    console.log("Closing all");
  }


  // Start ffmpeg via spawn
  function startStreaming(){

    console.log("Initializing FFMPEG....");

    var ops=[
      //"-debug_ts",

      //Input 0: Audio
      '-thread_queue_size', '1024',
      //'-i', 'http://www.jplayer.org/audio/m4a/Miaow-07-Bubble.m4a',
      '-itsoffset', audioOffset,
      '-f', 'pulse', '-i', 'default',
      '-acodec', 'aac',

      // Input 1: Video
      '-thread_queue_size', '1024',
      '-framerate', '25',
      //'-ss', offset,
      '-i', '-', '-f', 'image2pipe', '-c:v', 'libx264', '-preset', 'veryFast', //'-tune', 'zerolatency',
      '-pix_fmt', 'yuvj420p',

      // Output
      //'-async', '1000', '-vsync', '1',
      //'-af', 'aresample=async=1000',
      // This is to speed up video 0.5 double speed, 2.0 slow motion
      '-filter:v', videoSpeed,
      //This is to slow down audio, but audio is always good, no need this
      //'-filter:a', 'atempo=0.975',
      '-shortest', '-r', '30',
      '-f', 'mp4', 'recording.mp4'
      //'-f', 'flv', "rtmp://stream-staging.livepin.tv:1935/live/experiment"
    ];
    ffmpeg = spawn('ffmpeg', ops, { stdio: [ 'pipe', 'pipe', 2 ] } );
    ffmpeg.on('error',function(e){
      console.log('child process error' + e);
      closeAll();
    });
    ffmpeg.on('close', (code, signal) => {
      console.log( "child process terminated due to receipt of signal ${signal}");
      closeAll();
    });
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

})();
