#!/bin/sh
# usage: scripts/sheet.sh out.jpg f1 f2 ... (up to 9 frames from out/stills, row-major 3x3)
out=$1; shift
args=""; filt=""; lay=""
i=0
for f in "$@"; do
  args="$args -i out/stills/f_$f.png"
  filt="$filt[$i]scale=640:360[s$i];"
  i=$((i+1))
done
n=$i
L="0_0|640_0|1280_0|0_360|640_360|1280_360|0_720|640_720|1280_720"
lay=$(echo $L | cut -d'|' -f1-$n)
ins=""; j=0; while [ $j -lt $n ]; do ins="$ins[s$j]"; j=$((j+1)); done
ffmpeg -v error -y $args -filter_complex "$filt${ins}xstack=inputs=$n:layout=$lay:fill=black" "$out"
