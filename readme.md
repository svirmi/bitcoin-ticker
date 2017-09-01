Installing PulseAudio
https://askubuntu.com/questions/28176/how-do-i-run-pulseaudio-in-a-headless-server-installation

Start PA daemon
pulseaudio -D

Kill PA
pulseaudio -k

consfigure pulseaudio with this:
It is located under /etc/pulse/default.pa
load-module module-stream-restore restore_device=false

PulsaAudio Commands
List Default Settings: pacmd stat
Create sink: pactl load-module module-null-sink sink_name=Test


Installing Node


Installing ffmpeg
