set -e
# 014 · Vegaviana: huellas del Catastro + cubiertas medidas con el LiDAR del IGN (PNOA 2023), en texto compacto -> /tmp/escena.json
# encinas: detectadas en la ortofoto del IGN y fuera de los edificios
python3 motor/blender/prep014.py datos/014 /tmp/vveg.json
cat datos/014/cubiertas014_a.txt datos/014/cubiertas014_b.txt > /tmp/cubiertas014.txt
python3 motor/blender/lidar_roofs.py "$(pwd)" planos:/tmp/cubiertas014.txt /tmp/escena.json /tmp/vveg.json
