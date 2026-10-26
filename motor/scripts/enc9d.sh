set -e
cd /root/teatro
rm -f 009d_final.mp4 /tmp/p9w*
ffmpeg -v error -y -framerate 30 -i frames9d/%05d.jpg -c:v libx264 -preset fast -b:v 2300k -maxrate 3300k -bufsize 4600k -pass 1 -passlogfile /tmp/p9w -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i frames9d/%05d.jpg -i audio/music9c.wav -map 0:v -map 1:a -c:v libx264 -preset fast -b:v 2300k -maxrate 3300k -bufsize 4600k -pass 2 -passlogfile /tmp/p9w -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart 009d_final.mp4
echo ENC_DONE
