from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import subprocess
root=Path(__file__).resolve().parent.parent
review=root/'review';review.mkdir(exist_ok=True)
for name in ['AR','AR-Short','EN']:
    source=root/f'Naif-Almohammdi-CV-{name}.pdf'
    prefix=review/f'pdf-{name}'
    for previous in review.glob(f'pdf-{name}-[0-9]*.jpg'): previous.unlink()
    subprocess.run(['pdftoppm','-scale-to','1050','-jpeg','-jpegopt','quality=78',str(source),str(prefix)],check=True)
    pages=sorted(review.glob(f'pdf-{name}-[0-9]*.jpg'))
    thumbs=[]
    for p in pages:
        im=Image.open(p).convert('RGB');im.thumbnail((500,708))
        tile=Image.new('RGB',(520,748),'#e9e9e9');tile.paste(im,((520-im.width)//2,10))
        ImageDraw.Draw(tile).text((15,725),p.stem,fill='#222')
        thumbs.append(tile)
    sheet=Image.new('RGB',(1040,748*((len(thumbs)+1)//2)),'#e9e9e9')
    for i,tile in enumerate(thumbs):sheet.paste(tile,((i%2)*520,(i//2)*748))
    sheet.save(review/f'contact-{name}.jpg',quality=80)
