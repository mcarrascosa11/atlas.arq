set -e
cd /root/teatro
ffmpeg -v error -y -framerate 30 -i frames5/%05d.jpg -c:v libx264 -preset fast -b:v 1900k -maxrate 2800k -bufsize 3800k -pass 1 -passlogfile /tmp/p5 -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i frames5/%05d.jpg -i audio/music5.wav -map 0:v -map 1:a -c:v libx264 -preset fast -b:v 1900k -maxrate 2800k -bufsize 3800k -pass 2 -passlogfile /tmp/p5 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart 005_web.mp4
echo ENC_DONE
