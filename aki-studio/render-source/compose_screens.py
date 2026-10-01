"""Flatten measured app regions into one opaque screen, eliminating z-fighting."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
root=Path(__file__).resolve().parent/'public'/'textures'
base=Image.open(root/'screen-base.png').convert('RGB')
layout=json.loads((root/'panel-layout.json').read_text())
for key,box in layout.items():
    sx,sy=base.width/430,base.height/932
    size=(round(box['width']*sx),round(box['height']*sy))
    panel=Image.open(root/(key+'-panel.png')).convert('RGB').resize(size,Image.Resampling.LANCZOS)
    mask=Image.new('L',size);ImageDraw.Draw(mask).rounded_rectangle((0,0,size[0]-1,size[1]-1),radius=26*sx,fill=255)
    image=base.copy();image.paste(panel,(round(box['x']*sx),round(box['y']*sy)),mask)
    image.save(root/('screen-'+key+'.png'))
