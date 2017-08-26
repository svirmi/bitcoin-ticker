// IMPORTANT READ!
// Audio works once we disable the disabling of the Audio
// from here: /Users/sebap/git/empirical/bullman-experiments/bullman/node_modules/chrome-launcher/flags.js

// Chrome Dev Tools: https://chromedevtools.github.io/devtools-protocol/

const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const spawn = require('child_process').spawn;


//Examples of perfectly aligned videoSpeed
// node s.js "https://www.youtube.com/watch?v=szoOsG9137U" -1
// node s.js "https://www.youtube.com/watch?v=X_gnyJeVr28" -1
// node s.js "https://www.youtube.com/watch?v=KWh9YLtbbws" -1
// node s.js "https://www.youtube.com/watch?v=R1_VNTdRJNI" -1
// node s.js "https://www.youtube.com/watch?v=-G30tD8sPuw" -1
// node s.js "https://www.youtube.com/watch?v=wAVzKY-u-ac" -1
// node s.js "https://www.youtube.com/watch?v=5-prFsuWdqs" -1

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

// call this
(async function() {

  var args = process.argv.slice(2);
  var url = getUrl(args); // 0 "http://urltoberecorded.com/index.html"
  var audioOffset = getAudioOffset(args); // 1 - i.e: 1.0

  //init vars
  const streamStats = {
    printStats: true,
    second : new Date(),
    totalSeconds : 0,
    framesPerSecond : 0,
    totalFrames: 0,
    totalFramesForFPS: 0, // Observerd FPS is streamStats.totalFramesForFPS / 5
  };


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

    trackStats(event);

    if (Page) {
      // log(event.sessionId);
      //log( "Event SessionId: " + event.sessionId + " Medatada: " + JSON.stringify (event.metadata) );
      //log( "Event Data: " + event.data );
      Page.screencastFrameAck({sessionId: event.sessionId})
      .catch((err) => {
        log("onScreencastAck: ", err);
      });

      // if(streamStats.totalFrames == 1){
      //   log("Just captured first frame to be sent to FFMPEG.");
      // }

      const cutoutSecond = 10
      if(streamStats.totalSeconds == cutoutSecond && !ffmpeg){
        log("This is the streamStats: " + JSON.stringify(streamStats));
        log("Disabling stats printing...");
        streamStats.printStats = false;
        // If we have captured at 30 fps we will need to speed up
        const needsSpeedUp = (streamStats.totalFramesForFPS / 5) >= 29;
        ffmpegStart(needsSpeedUp);
      }

      if(streamStats.totalSeconds > (cutoutSecond + 1) && ffmpeg && ffmpeg.stdin){
        var img = new Buffer(event.data, "base64");
        ffmpeg.stdin.write(img);
      }
      // else{
      //   log("ffmpeg not ready yet..");
      // }
    }
  }

  function trackStats(event){
    const currentSecond = new Date();
    if (streamStats.second.toString() != currentSecond.toString() ){
        if(streamStats.printStats && streamStats.totalSeconds > 0 ){
            log("Second at: " + streamStats.second + " has " + streamStats.framesPerSecond + " frames" );
        }
        streamStats.totalSeconds++;
        streamStats.second = currentSecond;
        streamStats.framesPerSecond = 0;
        streamStats.framesPerSecondAvg = streamStats.totalFrames / streamStats.totalSeconds;
    }

    if( streamStats.totalSeconds > 4 & streamStats.totalSeconds < 10 ){
        streamStats.totalFramesForFPS++;
    }

    streamStats.framesPerSecond++;
    streamStats.totalFrames++;
  }

  function closeAll(){
    remoteInterface.close();
    chrome.kill();
    log("Closing all");
  }

  // Start ffmpeg via spawn
  function ffmpegStart(needsSpeedUp){

    log("Initializing FFMPEG....");
    var videoSpeed = "setpts=1*PTS";
    if (needsSpeedUp){
        log("This stream will be sped. Presentation rate at 0.835*PTS." )
        videoSpeed = "setpts=0.835*PTS";
    }else{
        log("This stream does not need to be sped up. Presentation rate at 1*PTS." )
    }

    var ops=[
      //"-debug_ts",

      //Input 0: Audio
      '-thread_queue_size', '1024',
      '-itsoffset', audioOffset,
      '-r', '25',
      '-i', 'http://www.jplayer.org/audio/m4a/Miaow-07-Bubble.m4a',
      //'-f', 'pulse', '-i', 'default',
      '-acodec', 'aac',

      // Input 1: Video
      '-thread_queue_size', '1024',
      //'-framerate', '25',
      //'-ss', offset,
      '-i', '-', '-f', 'image2pipe', '-c:v', 'libx264', '-preset', 'veryFast', //'-tune', 'zerolatency',
      '-pix_fmt', 'yuvj420p',

      // Output
      // '-async', '1', '-vsync', '1',
      // '-af', 'aresample=async=1000',
      // This is to speed up video 0.5 double speed, 2.0 half as slow
      '-filter:v', videoSpeed,
      //'-filter:v', 'fps=fps=25',
      //This is to slow down audio, but audio is always good, no need this
      //'-filter:a', 'aresample=async=1', // no effect detected maybe we need buffer. it is causing sometimes to fail
      //'-shortest',
      //'-r', '25',
      '-threads', '0',
      '-f', 'mp4', 'recording.mp4'
      //'-f', 'flv', "rtmp://stream-staging.livepin.tv:1935/live/experiment"
    ];
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

})();
