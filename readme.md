Debugging the app in the cloud platform server

pgrep node //lists all the node processes
pgrep chrome //lists all the chrome processes
pgrep ffmpeg //lists all the ffmpeg processes

sudo kill <port>

Installing PulseAudio
https://askubuntu.com/questions/28176/how-do-i-run-pulseaudio-in-a-headless-server-installation

Start PA daemon
pulseaudio -D

Kill PA
pulseaudio -k

Configure pulseaudio with this:
It is located under /etc/pulse/default.pa
load-module module-stream-restore restore_device=false

PulsaAudio Commands
List Default Settings: pacmd stat
Create sink: pactl load-module module-null-sink sink_name=Test

Enable pulseaudio at startup time
/etc/pulse/client.conf change "autospawn=no" to "autospawn=yes."

This is to configure as a Daemon on https://github.com/davidedg/NAS-mod-config/blob/master/bt-sound/bt-sound-Bluez5_PulseAudio5.txt

# systemctl start pulseaudio.service

# systemctl stop pulseaudio.service

# systemctl -l status pulseaudio.service

Troubleshooting:
https://lists.freedesktop.org/archives/pulseaudio-discuss/2014-September/021447.html

Configuring Google chrome
Edit VM, Custom Metadata
key: startup-script
content:
#! /bin/bash
pulseaudio -D
cd /home/seba/git/bullman/web
node index.js

# Installing Node

Installing ffmpeg we need to see if we can use ffmpeg that uses the gpu on google cloud platform
for performance gains

# Installing Redis:

Link: https://redis.io/topics/quickstart

Solving write issues (https://stackoverflow.com/questions/19581059/misconf-redis-is-configured-to-save-rdb-snapshots)
$ redis-cli
127.0.0.1:6379> config set stop-writes-on-bgsave-error no

## IMPORTANT READ!

Audio works once we disable the disabling of the Audio
from here: /Users/sebap/git/empirical/bullman-experiments/bullman/node_modules/chrome-launcher/flagindex.js

Chrome Dev Tools: https://chromedevtools.github.io/devtools-protocol/

const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;

## Examples of perfectly aligned videoSpeed

node index.js "https://www.youtube.com/watch?v=0pdCW9-eiVU" -2 experiment // 30fps
node index.js "https://www.youtube.com/watch?v=szoOsG9137U" -2 experiment // 30fps
node index.js "https://www.youtube.com/watch?v=X_gnyJeVr28" -2 experiment // 30fps
node index.js "https://www.youtube.com/watch?v=KWh9YLtbbws" -2 experiment // 30fps
node index.js "https://www.youtube.com/watch?v=R1_VNTdRJNI" -2 experiment // 30fps
node index.js "https://www.youtube.com/watch?v=-G30tD8sPuw" -2 experiment // 30fps
node index.js "https://www.youtube.com/watch?v=wAVzKY-u-ac" -2 experiment // 25fps
node index.js "https://www.youtube.com/watch?v=5-prFsuWdqs" -2 experiment // 25fps
node index.js "https://www.youtube.com/watch?v=Z32qL2MRkJM" -2 experiment // 24fps
node index.js "https://www.youtube.com/watch?v=-G30tD8sPuw" -2 experiment2

# Knowledge Base

This is what I have learnt so far. It seems that there are videos that are recorded at 25fps and at 30fpms
It seems that when we capture at 30fps we need to speed up the playback and when
we capture at 25fps we need to play it back a normal speed.
we can learn about this by looking into the video and analizing whats the rate
what we need to find out is how we can make it so that is is being done
at ffmpeg level and there is no problem with it

## Mathematically

Streams recorded at 30 fps are shown at a rate of 1 frame every 33 ms ( 121.212121 faster than 25fps )
Streams recorded at 25 fps are shown at a rate of 1 frame every 40 ms

In other words in order to achieve the same speed we need to accelarate teh 30fps
by an inverse factor of 0.825, hence the property "setpts=0.825*PTS"
but adjusted for some reason we need to use "setpts=0.835*PTS"

This value is derived from the inverse relation of
33ms => 100
40ms => x
x = (33 \* 100) / 40 = 82.5

We do not have support for 24fps, and if there is any video recorded at
24fps we will not work and will look choppy but we can fix it need more time
https://youtu.be/K943cKvEmuI
