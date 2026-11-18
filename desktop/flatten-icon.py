# Writes a copy of a PNG without transparency (alpha onto a dark blue background): the App Store rejects icons with an alpha channel.
import sys
from PIL import Image
i=Image.open(sys.argv[1]).convert("RGBA")
bg=Image.new("RGB",i.size,(11,29,58));bg.paste(i,mask=i.split()[3]);bg.save(sys.argv[2])
