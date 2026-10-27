# Música a −14 LUFS y montaje a dos pasadas (2300 kb/s + AAC 128 k). uso: enc_ci.sh SCRIPT_MUSICA NOMBRE
set -euo pipefail
MUSIC="$1"; OUT="$2"; W=/tmp/enc; mkdir -p $W
python "$GITHUB_WORKSPACE/$MUSIC" $W/raw.wav
I=$(ffmpeg -hide_banner -nostats -i $W/raw.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python -c "print(round(-14-($I),2))")
ffmpeg -hide_banner -loglevel error -y -i $W/raw.wav -af "volume=${G}dB,alimiter=limit=0.89:level=false" $W/music.wav
mkdir -p "$GITHUB_WORKSPACE/videos"; O="$GITHUB_WORKSPACE/videos/$OUT.mp4"; F=/tmp/frames
ffmpeg -v error -y -framerate 30 -i $F/%05d.jpg -c:v libx264 -preset fast -b:v 2300k -maxrate 3300k -bufsize 4600k -pass 1 -passlogfile $W/p -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i $F/%05d.jpg -i $W/music.wav -map 0:v -map 1:a -c:v libx264 -preset fast -b:v 2300k -maxrate 3300k -bufsize 4600k -pass 2 -passlogfile $W/p -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart "$O"
D=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$O"); L=$(ffmpeg -hide_banner -nostats -i "$O" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
echo "video=$OUT duracion=$D lufs=$L md5=$(md5sum "$O" | cut -c1-32) fecha=$(date -u +%FT%TZ)" | tee "$GITHUB_WORKSPACE/motor/ci/ok.txt"
