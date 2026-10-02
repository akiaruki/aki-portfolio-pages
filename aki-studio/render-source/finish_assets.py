"""Convert Remotion stills into compact, metadata-free website posters."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
for source in (root/'stills').glob('story-*.png'):
    Image.open(source).convert('RGB').save(root.parent/'assets'/(source.stem.replace('story-','story-v4-')+'.webp'),'WEBP',quality=92,method=6)
