# pip install moviepy numpy pillow
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from moviepy.editor import VideoClip

W, H = 1080, 1920
DURATION = 3.0 # seconds
FPS = 30

# One-line bird path: approximate beak -> head -> body -> wing -> tail
# Points in relative coordinates
PATH = [
    (0.78, 0.30), # beak tip
    (0.68, 0.32), (0.62, 0.31), (0.62, 0.37), # head loop
    (0.58, 0.43), (0.50, 0.50), (0.38, 0.55), # body
    (0.18, 0.25), (0.32, 0.32), # upper wing
    (0.22, 0.45), (0.35, 0.48), # lower wing notch
    (0.48, 0.65), (0.55, 0.75), (0.45, 0.82), # tail
    (0.60, 0.68), (0.72, 0.48), (0.78, 0.30), # close back to beak
]

def interp_path(path, t):
    # t = 0..1 progress along total path
    pts = np.array(path)
    # Convert to pixels
    pts[:,0] *= W
    pts[:,1] *= H
    # cumulative length
    seg_lens = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    total = seg_lens.sum()
    target = t * total
    acc = 0
    out = [pts[0]]
    for i, l in enumerate(seg_lens):
        if acc + l >= target:
            ratio = (target - acc) / l if l>0 else 0
            out.append(pts[i] + ratio*(pts[i+1]-pts[i]))
            break
        out.append(pts[i+1])
        acc += l
    return out

def make_frame(t):
    # 1. Gradient background dark green -> light green
    img = Image.new('RGB', (W, H), (0,0,0))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        ratio = y / H
        # dark #1A3D2A to light #A8C9A0
        r = int(26 + (168-26)*ratio)
        g = int(61 + (201-61)*ratio)
        b = int(42 + (160-42)*ratio)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    
    # 2. Draw glowing line up to progress
    progress = t / DURATION
    pts = interp_path(PATH, progress)
    
    # Glow layer
    glow = Image.new('RGBA', (W, H), (0,0,0,0))
    g_draw = ImageDraw.Draw(glow)
    if len(pts) > 1:
        g_draw.line(pts, fill=(160, 255, 180, 255), width=18, joint='curve')
        g_draw.line(pts, fill=(220, 255, 220, 255), width=8, joint='curve')
    
    # Blur for glow
    glow = glow.filter(ImageFilter.GaussianBlur(radius=12))
    img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
    
    # Sharp core line
    draw2 = ImageDraw.Draw(img)
    if len(pts) > 1:
        # convert to int
        ipts = [(int(x), int(y)) for x,y in pts]
        draw2.line(ipts, fill=(230, 255, 230), width=5, joint='curve')
    
    # Sparkle at tip
    if pts:
        tx, ty = pts[-1]
        sd = ImageDraw.Draw(img)
        for r in [20, 10, 4]:
            sd.ellipse([tx-r, ty-r, tx+r, ty+r], fill=(255,255,255, int(150/r)))
    
    # Text at bottom
    txt_draw = ImageDraw.Draw(img)
    txt_draw.text((W//2, H-200), "Bird Trails", fill="white", anchor="mm", font=None)
    
    return np.array(img)

clip = VideoClip(make_frame, duration=DURATION)
clip.write_videofile("splash_video.mp4", fps=FPS, codec='libx264')
print("Done: splash_video.mp4")