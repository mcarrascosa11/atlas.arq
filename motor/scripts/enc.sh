set -e
cd /root/teatro
ffmpeg -v error -y -i 004_teatro_del_mondo.mp4 -c:v libx264 -preset fast -b:v 1750k -maxrate 2600k -bufsize 3500k -pass 1 -passlogfile /tmp/p2 -an -f mp4 /dev/null
ffmpeg -v error -y -i 004_teatro_del_mondo.mp4 -c:v libx264 -preset fast -b:v 1750k -maxrate 2600k -bufsize 3500k -pass 2 -passlogfile /tmp/p2 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart 004_web.mp4
echo ENC_DONE
