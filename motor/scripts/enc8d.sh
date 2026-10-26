set -e
cd /root/teatro
rm -f 008_final_c.mp4 /tmp/p8z*
ffmpeg -v error -y -framerate 30 -i frames8/%05d.jpg -c:v libx264 -preset fast -b:v 2300k -maxrate 3300k -bufsize 4600k -pass 1 -passlogfile /tmp/p8z -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i frames8/%05d.jpg -i audio/music8c.wav -map 0:v -map 1:a -c:v libx264 -preset fast -b:v 2300k -maxrate 3300k -bufsize 4600k -pass 2 -passlogfile /tmp/p8z -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart 008_final_c.mp4
echo ENC_DONE
