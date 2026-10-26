set -e
cd /root/teatro
ffmpeg -v error -y -framerate 30 -i frames6/%05d.jpg -c:v libx264 -preset fast -b:v 2400k -maxrate 3400k -bufsize 4800k -pass 1 -passlogfile /tmp/p6 -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i frames6/%05d.jpg -i audio/music6.wav -map 0:v -map 1:a -c:v libx264 -preset fast -b:v 2400k -maxrate 3400k -bufsize 4800k -pass 2 -passlogfile /tmp/p6 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart 006_web.mp4
echo ENC_DONE
