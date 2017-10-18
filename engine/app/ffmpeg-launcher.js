const spawn = require('child_process').spawn;
const logger = require('./logger');
const execAsync = require('async-child-process').execAsync;

var ffmpeg = null;

var restart = false;
var restartParams = null;

function closeAll(){
  logger.log("Closing all");
  if(restart){
    logger.log("We are estarting ffmpeg here right after we are closing because we need to restart.");
    restart = false;
    ffmpeg = start(restartParams);
    restartParams.callback(ffmpeg);
  }
}

// This is a eager restart, we will restart first an then kill the previous one
// so we do not loose stream on the media server, ffmpeg gotta be amazing
exports.restart = async function(params){
  // we will only restart once after 5 seconds
  if(ffmpeg == null){
    return ffmpeg;
  }
  logger.log("We are restarting ffmpeg, we are noticing a lot of fluctuation on the framerate...")
  restart = true;
  restartParams = params
  try {
    ffmpeg.stdout.pause();
    ffmpeg.stdin.pause();
    await execAsync('kill -9 ' + ffmpeg.pid );
  }catch(error){
    logger.log("[ERROR] Failed to close ffmpeg.." + error)
    process.exit(1);
  }
  ffmpeg = null;
  return ffmpeg;
}

// Start ffmpeg via spawn
var start = exports.start = function(params){

  logger.log("Initializing FFMPEG....");
  logger.log("Initializing FFMPEG with FPS: " + params.fps);

  const ops = ffmpegOpts(params)
  ffmpeg = spawn('ffmpeg', ops, { stdio: [ 'pipe', 'pipe', 2 ] } );
  ffmpeg.on('error',function(e){
    logger.log('child process error' + e);
    closeAll();
  });
  ffmpeg.on('close', (code, signal) => {
    logger.log( "child process terminated due to receipt of signal ${signal}");
    closeAll();
  });

  logger.log( "child process started on this port: " + ffmpeg.pid);

  return ffmpeg;
}

function ffmpegOpts(params){
  const ops=[
    //"-debug_ts",

    //Input 0: Audio
    '-thread_queue_size', '1024',
    '-itsoffset', params.audioOffset,
    //'-r', '25',
    //'-i', 'http://www.jplayer.org/audio/m4a/Miaow-07-Bubble.m4a',
    '-f', 'pulse', '-i', params.outputName + ".monitor",
    '-acodec', 'aac',

    // Input 1: Video
    '-thread_queue_size', '1024',
    '-framerate', params.fps,
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
    '-vb', '20M',
    '-r', params.fps,
    '-threads', '0',
    //'-f', 'mp4', 'recording.mp4'
    '-c:a', 'aac', '-strict', '-2',
    //'-acodec', 'aac', '-strict', 'experimental', '-ab', '48k', '-ac', '2', '-ar', '44100',
    //'-af', 'aresample=async=1',
    '-f', 'flv', params.rtmpUrl
  ];
  return ops;
}
