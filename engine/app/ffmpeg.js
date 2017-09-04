const spawn = require('child_process').spawn;
const logger = require('./logger');
const execAsync = require('async-child-process').execAsync;

var ffmpeg = null;

function closeAll(){
  logger.log("Closing all");
}

exports.restart = async function(fps, audioOffset, outputName, callback){
  // we will only restart once after 5 seconds
  if(ffmpeg == null){
    return ffmpeg;
  }
  logger.log("We are restarting ffmpeg, we are noticing a lot of fluctuation on the framerate. Waiting 5 seconds...")

  try {
    ffmpeg.stdout.pause();
    ffmpeg.stdin.pause();
    await execAsync('kill -9 ' + ffmpeg.pid );
  }catch(error){
    logger.log("[ERROR] Failed to close ffmpeg.." + error)
    process.exit(1);
  }
  ffmpeg = null;
  setTimeout(function() {
    ffmpeg = start(fps, audioOffset, outputName);
    callback(ffmpeg);
  }, 1000);
  return ffmpeg; //which should be null at this point
}

// Start ffmpeg via spawn
var start = exports.start = function(fps, audioOffset, outputName){

  logger.log("Initializing FFMPEG....");
  logger.log("Initializing FFMPEG with FPS: " + fps);

  const ops = ffmpegOpts(fps, audioOffset, outputName)
  ffmpeg = spawn('ffmpeg', ops, { stdio: [ 'pipe', 'pipe', 2 ] } );
  ffmpeg.on('error',function(e){
    logger.log('child process error' + e);
    closeAll();
  });
  ffmpeg.on('close', (code, signal) => {
    logger.log( "child process terminated due to receipt of signal ${signal}");
    closeAll();
  });

  return ffmpeg;
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
    //'-ss', offset,
    '-i', '-', '-f', 'image2pipe', '-c:v', 'libx264', '-preset', 'veryFast', //'-tune', 'zerolatency',
    '-pix_fmt', 'yuvj420p',

    // Output
    // '-async', '1', '-vsync', '1',
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
