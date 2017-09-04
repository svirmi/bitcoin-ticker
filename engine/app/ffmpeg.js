const spawn = require('child_process').spawn;
const logger = require('./logger');

function closeAll(){
  logger.log("Closing all");
}

exports.restart = function(fps, audioOffset, outputName){
  ffmpeg.stdin.pause();
  ffmpeg.kill('SIGINT');
  return start(fps, audioOffset, outputName);
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
