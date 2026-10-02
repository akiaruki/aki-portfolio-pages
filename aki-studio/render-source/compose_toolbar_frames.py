"""Reuse the unchanged Blender scene, replacing only the projected header region."""
from pathlib import Path
from PIL import Image, ImageChops
import json, hashlib, argparse

root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--original-frames',type=Path,required=True)
parser.add_argument('--rendered-frames',type=Path,default=root/'public/frames-v4')
parser.add_argument('--output',type=Path,default=root/'public/frames-v4')
cfg=parser.parse_args()
original=cfg.original_frames;rendered=cfg.rendered_frames;output=cfg.output
assert original.resolve()!=output.resolve(), 'Keep original frames intact'
output.mkdir(parents=True,exist_ok=True)
projection=json.loads((root/'toolbar-projection.json').read_text())
assert len(projection)==480
assert all(row['bounds']==projection[75]['bounds'] for row in projection[75:]), 'Handset continues moving'
reference=Image.open(original/'0075.png').convert('RGBA').crop(projection[75]['bounds'])
replacement=Image.open(rendered/'0075.png').convert('RGBA').crop(projection[75]['bounds'])
regions=[];stationaryVariance=[]
for row in projection:
    frame=row['frame'];box=row['bounds']
    before=Image.open(original/f'{frame:04d}.png').convert('RGBA')
    if frame>=75:
        variance=max(hi for lo,hi in ImageChops.difference(before.crop(box),reference).getextrema())
        assert variance<=1, f'Unexpected stationary header change at {frame}: {variance}'
        stationaryVariance.append(variance)
        crop=replacement
    else:
        crop=Image.open(rendered/f'{frame:04d}.png').convert('RGBA').crop(box)
    composed=before.copy();composed.paste(crop,box)
    outside=ImageChops.difference(composed,before)
    outside.paste((0,0,0,0),box)
    assert not any(hi for lo,hi in outside.getextrema())
    composed.save(output/f'{frame:04d}.png',compress_level=3)
    regions.append({'frame':frame,'bounds':box,'originalSHA256':hashlib.sha256((original/f'{frame:04d}.png').read_bytes()).hexdigest(),'sha256':hashlib.sha256((output/f'{frame:04d}.png').read_bytes()).hexdigest()})
    if frame%100==0: print('Composed',frame,flush=True)
(root/'toolbar-composition-evidence.json').write_text(json.dumps({'frames':480,'fps':60,'uniqueRenderedPoses':76,'stationaryHeaderFrames':405,'unchangedPixelsOutsideProjectedHeader':True,'handsetProjectionStaticAfterFrame75':True,'stationaryHeaderMaximumQuantizationVariance':max(stationaryVariance),'regions':regions},indent=2)+'\n')
print('Complete: 480 frames; every pixel outside toolbar region retained',flush=True)
