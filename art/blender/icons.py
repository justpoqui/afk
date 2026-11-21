"""Renders the game's UI icons (the pictures that replace emoji) to assets/icons/<name>.webp.

Each icon is a small model in the same style as the item art (outlined, soft lighting). Icons for
materials, gear and monsters reuse the item and sprite renders instead (see js/icons.js).

    python art/blender/icons.py            # all icons
    python art/blender/icons.py coin gem   # only these
"""
import os
import sys
import math
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403
from items import glow, group, prism, seg, mix, glyph_symbol, R  # noqa: E402

OUT = os.path.join(ROOT, 'assets', 'icons')
GOLD = '#f2c14e'


def gold(emit=0.0):
    return mat(GOLD, rough=0.25, metal=0.9, emit=emit)


def steel():
    return mat('#c8d0da', rough=0.25, metal=0.9)


def wood():
    return mat('#8a5a35', rough=0.8)


def face(rot=(-30, 0, 15)):
    """Flat emblems face the camera a little."""
    group(rot=rot)


def star_pts(n, r1, r2, rot=90):
    return [((r1 if k % 2 == 0 else r2) * math.cos(math.radians(rot + k * 180 / n)), (r1 if k % 2 == 0 else r2) * math.sin(math.radians(rot + k * 180 / n))) for k in range(2 * n)]


# ---------------- currency and core ----------------
def coin():
    for dz, dx in ((-0.35, 0.25), (0, 0)):
        cyl((dx, 0, dz), 0.8, 0.18, gold(), rot=(90, 0, 0), verts=32)
        torus((dx, -0.1, dz), 0.66, 0.05, mat('#d9a030', rough=0.3, metal=0.9), rot=(90, 0, 0))
    prism(star_pts(5, 0.4, 0.17), 0.08, mat('#ffe58a', rough=0.3, metal=0.8), loc=(0, -0.12, 0))
    face()


def gem():
    # a cut diamond seen from the side: flat table, short crown, pointed pavilion
    m = mat('#4fd0ff', rough=0.05, metal=0.1, emit=0.5)
    cyl((0, 0, 0.42), 0.95, 0.38, m, r2=0.6, verts=8, smooth=False)
    cyl((0, 0, -0.32), 0.95, 1.1, m, r2=0.0, verts=8, rot=(180, 0, 0), smooth=False)
    for a in range(0, 360, 45):   # facet edges
        x, y = 0.95 * math.cos(math.radians(a)), 0.95 * math.sin(math.radians(a))
        tube([(x, y, 0.23), (0, 0, -0.87)], [0.012, 0.012], mat('#c8f4ff', emit=1.5), outline=False)
        tube([(x, y, 0.23), (x * 0.63, y * 0.63, 0.61)], [0.012, 0.012], mat('#c8f4ff', emit=1.5), outline=False)
    sphere((-0.3, -0.55, 0.45), 0.08, glow('#ffffff', 6), outline=False)
    group(rot=(-20, 0, 22))


def scroll():
    paper = mat('#f2e3bc', rough=0.85)
    box((0, 0, 0), (1.3, 0.04, 1.2), paper)
    for z in (0.62, -0.62):
        cyl((0, 0, z), 0.16, 1.55, paper, rot=(0, 90, 0), verts=20)
        for x in (-0.8, 0.8):
            sphere((x, 0, z), 0.1, wood())
    for k in range(4):
        box((-0.05, -0.04, 0.3 - k * 0.2), (0.9 - (k % 2) * 0.2, 0.01, 0.04), mat('#8a6a4a'), outline=False)
    box((0, -0.06, -0.1), (0.12, 0.02, 1.3), mat('#c8402a'), outline=False)
    face()


def backpack():
    lm = mat('#9a6a40', rough=0.8)
    box((0, 0, -0.1), (1.2, 0.7, 1.4), lm, bevel=0.2)
    box((0, -0.38, -0.35), (0.8, 0.12, 0.55), mat('#7a5030', rough=0.8), bevel=0.08)
    sphere((0, 0, 0.55), 0.62, mat('#7a5030', rough=0.8), scale=(1, 0.62, 0.45))
    box((0, -0.42, 0.25), (0.14, 0.04, 0.3), mat('#3a2614'), outline=False)
    box((0, -0.46, 0.15), (0.12, 0.03, 0.1), gold(), outline=False)
    torus((0, 0, 0.85), 0.2, 0.05, mat('#3a2614'), rot=(90, 0, 0))
    group(rot=(0, 0, 20))


def bank():
    stone, roof = mat('#e8e4dc', rough=0.7), mat('#c8c0b0', rough=0.7)
    box((0, 0, -0.75), (1.8, 1.0, 0.18), roof, bevel=0.03)
    box((0, 0, -0.6), (1.6, 0.9, 0.12), stone)
    for x in (-0.6, -0.2, 0.2, 0.6):
        cyl((x, -0.2, -0.05), 0.11, 1.0, stone, verts=14)
    box((0, 0, 0.5), (1.7, 0.95, 0.14), roof)
    prism([(-0.9, 0), (0.9, 0), (0, 0.45)], 0.9, stone, loc=(0, 0, 0.57))
    cyl((0, -0.47, 0.72), 0.13, 0.04, gold(0.3), rot=(90, 0, 0), verts=20)
    group(rot=(0, 0, 18))


def heart():
    m = mat('#e8434a', rough=0.25, emit=0.15)
    for x in (-0.36, 0.36):
        sphere((x, 0, 0.25), 0.48, m)
    cyl((0, 0, -0.35), 0.72, 0.95, m, r2=0.0, rot=(180, 0, 0), verts=24, scale=(1.15, 0.62, 1))
    sphere((-0.4, -0.4, 0.45), 0.1, glow('#ffffff', 3), outline=False)
    face((-10, 0, 10))


def swords():
    for s_ in (-1, 1):
        rot = (0, s_ * 40, 0)
        o = []
        o.append(box((0, 0, 0.35), (0.28, 0.08, 1.5), steel()))
        o.append(cyl((0, 0, 1.18), 0.2, 0.3, steel(), r2=0.0, verts=4, scale=(1, 0.3, 1), rot=(0, 0, 45)))
        o.append(box((0, 0, -0.45), (0.75, 0.16, 0.16), gold(), bevel=0.03))
        o.append(cyl((0, 0, -0.72), 0.1, 0.45, mat('#5a3d22')))
        o.append(sphere((0, 0, -0.98), 0.13, gold()))
        bpy.ops.object.empty_add(location=(0, 0, 0))
        e = bpy.context.object
        for x in o:
            x.parent = e
        e.rotation_euler = [math.radians(a) for a in rot]
        e.location = (0, s_ * 0.05, 0)
    face((-20, 0, 10))


def shield():
    pts = [(0, 0.95), (0.7, 0.75), (0.68, 0.0), (0, -0.95), (-0.68, 0.0), (-0.7, 0.75)]
    prism(pts, 0.16, gold())
    prism([(x * 0.82, z * 0.82 + 0.02) for x, z in pts], 0.06, mat('#3f6fd1', rough=0.4), loc=(0, -0.1, 0))
    prism([(-0.08, 0.5), (0.08, 0.5), (0.08, -0.55), (-0.08, -0.55)], 0.04, gold(), loc=(0, -0.14, 0))
    prism([(-0.4, 0.15), (0.4, 0.15), (0.4, 0.0), (-0.4, 0.0)], 0.04, gold(), loc=(0, -0.14, 0))
    face()


def grace():
    torus((0, 0, 0.55), 0.45, 0.07, glow('#ffe58a', 4), rot=(70, 0, 0))
    sphere((0, 0, -0.05), 0.32, mat('#fff6dc', rough=0.4))
    for s_ in (-1, 1):
        for k in range(3):
            sphere((s_ * (0.45 + k * 0.22), 0.05, 0.0 + k * 0.12 - 0.05), 0.28 - k * 0.04, mat('#ffffff', rough=0.6), scale=(1.4, 0.3, 0.7), rot=(0, s_ * (-20 - k * 15), 0))
    for _ in range(5):
        sphere((R.uniform(-0.9, 0.9), -0.3, R.uniform(-0.6, 0.8)), 0.04, glow('#fff1a8', 6), outline=False)
    face((-10, 0, 10))


def lock():
    torus((0, 0, 0.35), 0.38, 0.09, steel(), rot=(90, 0, 0))
    box((0, 0, -0.25), (1.05, 0.45, 0.85), gold(), bevel=0.1)
    sphere((0, -0.24, -0.15), 0.11, mat('#2a1f14'), outline=False)
    box((0, -0.24, -0.35), (0.08, 0.02, 0.25), mat('#2a1f14'), outline=False)
    face()


def crown():
    g = gold(0.15)
    cyl((0, 0, -0.35), 0.75, 0.45, g, verts=28)
    for k in range(5):
        a = math.radians(-60 + k * 30)
        x, y = 0.72 * math.sin(a), -0.72 * math.cos(a)
        cyl((x, y, 0.2), 0.16, 0.65, g, r2=0.02, verts=10)
        sphere((x, y, 0.55), 0.08, g)
    for x, c in ((-0.45, '#e8434a'), (0, '#4fd0ff'), (0.45, '#5cdc6a')):
        sphere((x, -0.62, -0.35), 0.11, glow(c, 1.5), outline=False)
    group(rot=(10, 0, 0))


def flame():
    for r, c, e, z in ((0.6, '#ff5a2a', 3, 0), (0.42, '#ffa03a', 4, 0.05), (0.25, '#ffe58a', 5, 0.1)):
        tube([(0, 0, -0.6 + z), (0, 0, -0.2 + z), (0.12, 0, 0.35 + z), (-0.05, 0, 0.95 + z * 2)], [r, r, r * 0.6, 0.01], glow(c, e), outline=(c == '#ff5a2a'))
    face((0, 0, 0))


def skull():
    m = mat('#efe6d2', rough=0.6)
    sphere((0, 0, 0.15), 0.62, m)
    box((0, -0.1, -0.42), (0.6, 0.55, 0.3), m, bevel=0.08)
    for s_ in (-1, 1):
        sphere((s_ * 0.22, -0.5, 0.1), 0.16, mat('#1b1426'), scale=(1, 0.5, 1.1), outline=False)
    cyl((0, -0.56, -0.12), 0.07, 0.05, mat('#1b1426'), rot=(90, 0, 0), verts=3, outline=False)
    for k in range(4):
        box((-0.18 + k * 0.12, -0.39, -0.5), (0.06, 0.02, 0.12), mat('#1b1426'), outline=False)
    face((-5, 0, 15))


def sparkle():
    prism(star_pts(4, 0.95, 0.22), 0.12, glow('#ffe58a', 4))
    prism(star_pts(4, 0.4, 0.1), 0.1, glow('#ffffff', 5), loc=(0.7, -0.1, 0.6))
    prism(star_pts(4, 0.3, 0.08), 0.1, glow('#ffffff', 5), loc=(-0.65, -0.1, -0.6))
    face((-10, 0, 0))


def warning():
    prism([(-0.95, -0.75), (0.95, -0.75), (0, 0.9)], 0.18, mat('#ffcc2a', rough=0.4))
    prism([(-0.7, -0.6), (0.7, -0.6), (0, 0.62)], 0.04, mat('#ffe066', rough=0.4), loc=(0, -0.1, 0))
    box((0, -0.14, 0.05), (0.14, 0.04, 0.6), mat('#1b1426'), outline=False)
    sphere((0, -0.14, -0.42), 0.09, mat('#1b1426'), scale=(1, 0.4, 1), outline=False)
    face()


def hourglass():
    for z in (0.75, -0.75):
        cyl((0, 0, z), 0.62, 0.14, wood(), verts=20)
    for s_ in (-1, 1):
        for x in (-0.48, 0.48):
            cyl((x, s_ * 0.3, 0), 0.04, 1.4, wood(), verts=8)
    glass = mat('#cfe8ff', rough=0.05, alpha=0.35)
    cyl((0, 0, 0.35), 0.45, 0.7, glass, r2=0.06, rot=(180, 0, 0), verts=20)
    cyl((0, 0, -0.35), 0.45, 0.7, glass, r2=0.06, verts=20)
    cyl((0, 0, 0.25), 0.3, 0.3, mat('#e8c070'), r2=0.05, rot=(180, 0, 0), verts=16, outline=False)
    cyl((0, 0, -0.52), 0.4, 0.3, mat('#e8c070'), r2=0.1, verts=16, outline=False)
    group(rot=(0, 15, 0))


def books():
    for k, (c, w) in enumerate((('#c8402a', 1.5), ('#3f6fd1', 1.35), ('#5cc46a', 1.45))):
        z = -0.45 + k * 0.32
        box((0.04 * (k - 1), 0, z), (w, 1.0, 0.28), mat(c, rough=0.6), rot=(0, 0, (k - 1) * 8), bevel=0.03)
        box((0.04 * (k - 1), -0.04, z), (w - 0.1, 1.0, 0.2), mat('#f6efdc'), rot=(0, 0, (k - 1) * 8), outline=False)
    group(rot=(0, 0, 20))


def clipboard():
    box((0, 0, 0), (1.3, 0.08, 1.7), wood(), bevel=0.06)
    box((0, -0.06, -0.1), (1.05, 0.03, 1.35), mat('#fbf6ea'))
    box((0, -0.06, 0.82), (0.55, 0.12, 0.22), steel(), bevel=0.04)
    for k in range(4):
        sphere((-0.35, -0.09, 0.3 - k * 0.3), 0.05, mat('#5cc46a'), outline=False)
        box((0.1, -0.09, 0.3 - k * 0.3), (0.65, 0.01, 0.05), mat('#8a8a9a'), outline=False)
    face()


def plate():
    cyl((0, 0, 0), 0.85, 0.1, mat('#f4f4f4', rough=0.3), verts=32)
    cyl((0, 0, 0.04), 0.6, 0.06, mat('#e4e4ec', rough=0.3), verts=32, outline=False)
    for x, w in ((-1.05, 0.08), (1.05, 0.1)):
        box((x, 0, 0.05), (w, 1.6, 0.04), steel())
    for t in (-0.04, 0, 0.04):
        box((-1.05 + t, -0.75, 0.05), (0.02, 0.3, 0.04), steel(), outline=False)
    group(rot=(30, 0, 10))


def speaker_body():
    box((-0.35, 0, 0), (0.4, 0.5, 0.55), mat('#3a3a4a', rough=0.4), bevel=0.06)
    cyl((-0.05, 0, 0), 0.25, 0.55, mat('#4a4a5a', rough=0.4), r2=0.6, rot=(0, 90, 0), verts=20)


def speaker():
    speaker_body()
    for r in (0.6, 0.9):
        pts = [(0.25 + r * math.cos(math.radians(a)), -0.05, r * math.sin(math.radians(a))) for a in range(-45, 46, 15)]
        tube(pts, [0.06] * len(pts), mat('#4fd0ff', emit=1.2))
    face((-20, 0, 15))


def mute():
    speaker_body()
    for a in (45, -45):
        box((0.65, -0.1, 0), (0.12, 0.06, 0.85), mat('#e8434a'), rot=(0, a, 0))
    face((-20, 0, 15))


def withdraw():
    box((0, 0, -0.6), (1.5, 0.9, 0.16), wood(), bevel=0.03)
    for x in (-0.72, 0.72):
        box((x, 0, -0.4), (0.08, 0.9, 0.5), wood())
    g = mat('#5cdc6a', rough=0.4, emit=0.4)
    cyl((0, 0, 0.45), 0.16, 0.7, g, verts=14)
    cyl((0, 0, -0.05), 0.42, 0.45, g, r2=0.0, rot=(180, 0, 0), verts=14)
    group(rot=(-10, 0, 15))


SKIN = '#f0c7a0'


def fist():
    s = mat(SKIN, rough=0.6)
    box((0, 0, -0.1), (0.95, 0.75, 0.8), s, bevel=0.25)
    for k in range(4):
        cyl((-0.33 + k * 0.22, -0.4, 0.15), 0.12, 0.35, s, rot=(0, 90, 0), verts=12)
    tube([(-0.5, -0.2, -0.2), (-0.35, -0.45, -0.05), (0.0, -0.48, -0.05)], [0.14, 0.13, 0.12], s)
    cyl((0, 0.1, -0.75), 0.33, 0.5, mat('#3f6fd1'), verts=16)
    face((-20, 0, 15))


def foot():
    s = mat(SKIN, rough=0.6)
    cyl((0, 0.35, 0.3), 0.26, 0.9, s, verts=16, rot=(-15, 0, 0))
    sphere((0, -0.1, -0.25), 0.4, s, scale=(0.85, 1.45, 0.55))
    for k, (x, r) in enumerate(((-0.24, 0.12), (-0.08, 0.1), (0.06, 0.09), (0.18, 0.08), (0.28, 0.07))):
        sphere((x, -0.62 + abs(x) * 0.3, -0.24), r, s)
    for _ in range(3):
        sphere((R.uniform(-0.6, 0.6), -0.9, R.uniform(-0.3, 0.3)), 0.05, glow('#ffe58a', 4), outline=False)
    group(rot=(0, 0, 30))


def arena():
    wall = mat('#d8c8a8', rough=0.8)
    cyl((0, 0, -0.2), 1.0, 0.75, wall, verts=36)
    cyl((0, 0, 0.0), 0.75, 0.8, mat('#c8a870', rough=0.9), verts=36, outline=False)
    for k in range(12):
        a = k * math.pi / 6
        box((1.0 * math.cos(a), 1.0 * math.sin(a), -0.15), (0.14, 0.04, 0.32), mat('#5a4a3a'), rot=(0, 0, math.degrees(a) + 90), outline=False)
    for x, c in ((-0.6, '#e8434a'), (0.6, '#3f6fd1')):
        cyl((x, -0.4, 0.45), 0.025, 0.6, wood(), verts=8)
        box((x + 0.15, -0.4, 0.62), (0.28, 0.02, 0.18), mat(c))
    group(rot=(15, 0, 0))


def puzzle():
    m = mat('#5cc46a', rough=0.4)
    box((0, 0, 0), (1.1, 0.25, 1.1), m, bevel=0.06)
    cyl((0.68, 0, 0), 0.24, 0.25, m, rot=(90, 0, 0), verts=20)
    cyl((0, 0, 0.68), 0.24, 0.25, m, rot=(90, 0, 0), verts=20)
    cyl((-0.48, -0.0, 0), 0.22, 0.27, mat('#1d1838'), rot=(90, 0, 0), verts=20, outline=False)
    face()


def burst():
    prism(star_pts(8, 0.95, 0.45), 0.12, glow('#ff7a2a', 3))
    prism(star_pts(8, 0.6, 0.3, rot=112), 0.1, glow('#ffe58a', 4), loc=(0, -0.1, 0))
    face((-10, 0, 0))


def dizzy():
    pts = [(math.cos(a) * (0.1 + a * 0.08), -0.05, math.sin(a) * (0.1 + a * 0.08)) for a in [i * 0.5 for i in range(18)]]
    seg(pts, 0.06, glow('#ffe58a', 3))
    for x, z in ((0.85, 0.5), (-0.7, 0.65), (0.6, -0.75)):
        prism(star_pts(5, 0.22, 0.09), 0.08, glow('#fff1a8', 4), loc=(x, -0.1, z))
    face((-10, 0, 0))


def coffin():
    pts = [(-0.3, 1.0), (0.3, 1.0), (0.55, 0.45), (0.38, -1.0), (-0.38, -1.0), (-0.55, 0.45)]
    prism(pts, 0.35, mat('#6a4428', rough=0.8))
    prism([(x * 0.85, z * 0.88) for x, z in pts], 0.05, mat('#4a2e1a'), loc=(0, -0.2, 0))
    box((0, -0.24, 0.25), (0.1, 0.03, 0.75), gold(), outline=False)
    box((0, -0.24, 0.4), (0.42, 0.03, 0.1), gold(), outline=False)
    face()


def tree():
    cyl((0, 0, -0.6), 0.18, 0.8, wood(), verts=12)
    g = mat('#4fa64a', rough=0.8)
    for x, z, r in ((0, 0.25, 0.6), (-0.42, 0.0, 0.42), (0.42, 0.0, 0.42), (0, 0.65, 0.42)):
        sphere((x, 0, z), r, g)


def portal():
    for k, c in enumerate(('#7a5aff', '#b48cff', '#e0d0ff')):
        torus((0, 0, 0), 0.85 - k * 0.22, 0.08, glow(c, 3 + k), rot=(90, k * 20, 0), outline=(k == 0))
    sphere((0, 0.05, 0), 0.25, mat('#1a1030', emit=0.2))
    face((-10, 0, 10))


def pickaxe():
    cyl((0, 0, -0.2), 0.13, 1.8, wood(), verts=12, rot=(0, 30, 0))
    tube([(-0.95, 0, 0.15), (-0.3, 0, 0.62), (0.3, 0, 0.75), (1.0, 0, 0.4)], [0.06, 0.2, 0.2, 0.05], steel())
    group(rot=(0, 0, 15))


def rod():
    tube([(-0.9, 0, -0.9), (0, 0, 0.0), (0.6, 0, 0.7), (0.95, 0, 0.95)], [0.12, 0.09, 0.06, 0.04], wood())
    cyl((-0.55, -0.12, -0.5), 0.24, 0.16, steel(), rot=(90, 0, 0), verts=16)
    tube([(0.95, 0, 0.95), (1.0, 0, 0.3), (0.98, 0, -0.3)], [0.01, 0.01, 0.01], mat('#e8e8f0'), outline=False)
    sphere((0.98, 0, -0.38), 0.14, mat('#e8434a'))
    sphere((0.98, 0, -0.27), 0.1, mat('#ffffff'))
    group(rot=(0, 0, 15))


def target():
    for k, c in enumerate(('#e8434a', '#ffffff', '#e8434a', '#ffffff', '#e8434a')):
        cyl((0, -0.02 * k, 0), 0.9 - k * 0.18, 0.12, mat(c, rough=0.5), rot=(90, 0, 0), verts=32, outline=(k == 0))
    cyl((0.35, -0.6, 0.35), 0.03, 1.1, wood(), rot=(45, 0, -45), verts=8)
    prism([(-0.1, 0), (0.1, 0), (0, 0.25)], 0.02, mat('#5cc46a'), loc=(0.65, -0.95, 0.68))
    face()


def muscle():
    s = mat(SKIN, rough=0.5)
    tube([(-0.85, 0, -0.55), (-0.2, 0, -0.4), (0.25, 0, -0.1)], [0.22, 0.25, 0.24], s)
    tube([(0.25, 0, -0.1), (0.35, 0, 0.35), (0.3, 0, 0.7)], [0.24, 0.2, 0.2], s)
    sphere((-0.15, -0.05, -0.2), 0.36, s, scale=(1.2, 0.9, 0.9))
    sphere((0.32, -0.05, 0.85), 0.25, s)
    box((-0.95, 0, -0.55), (0.25, 0.5, 0.5), mat('#3f6fd1'), bevel=0.05)
    face((-15, 0, 10))


def lightning():
    prism([(0.25, 1.0), (-0.3, 0.05), (0.02, 0.05), (-0.25, -1.0), (0.35, 0.15), (0.03, 0.15)], 0.18, glow('#ffe14a', 3))
    face((-10, 0, 10))


def tombstone():
    stone = mat('#9aa0aa', rough=0.85)
    box((0, 0, -0.2), (1.0, 0.3, 1.1), stone, bevel=0.05)
    cyl((0, 0, 0.35), 0.5, 0.3, stone, rot=(90, 0, 0), verts=24)
    box((0, -0.17, 0.15), (0.1, 0.02, 0.55), mat('#5a5a66'), outline=False)
    box((0, -0.17, 0.25), (0.35, 0.02, 0.1), mat('#5a5a66'), outline=False)
    box((0, 0, -0.8), (1.5, 0.8, 0.12), mat('#5aa04a', rough=0.9), bevel=0.04)
    face((-20, 0, 15))


def wind():
    for z, l in ((0.45, 1.0), (0.0, 1.3), (-0.45, 0.85)):
        pts = [(-0.9, 0, z), (l - 0.9, 0, z), (l - 0.7, 0, z + 0.18), (l - 0.9, 0, z + 0.3), (l - 1.05, 0, z + 0.18)]
        tube(pts, [0.06] * 5, mat('#cfeeff', emit=0.8))
    face((-10, 0, 0))


def shop():
    box((0, 0, -0.45), (1.6, 0.8, 0.6), wood(), bevel=0.05)
    for x in (-0.72, 0.72):
        cyl((x, -0.3, 0.15), 0.05, 1.0, wood(), verts=8)
    for k in range(6):
        box((-0.67 + k * 0.27, -0.3, 0.72), (0.27, 0.9, 0.08), mat('#e8434a' if k % 2 == 0 else '#ffffff'), rot=(20, 0, 0))
    for x, c in ((-0.4, '#ffa03a'), (0, '#5cdc6a'), (0.4, '#e8434a')):
        sphere((x, -0.3, -0.05), 0.14, mat(c, rough=0.4))
    group(rot=(0, 0, 15))


def up():
    cyl((0, 0, 0), 0.9, 0.16, mat('#2a8a4a', rough=0.4), rot=(90, 0, 0), verts=32)
    g = mat('#ffffff', rough=0.4)
    box((0, -0.12, -0.2), (0.22, 0.04, 0.6), g, outline=False)
    prism([(-0.4, 0.05), (0.4, 0.05), (0, 0.55)], 0.04, g, loc=(0, -0.12, 0))
    face()


def tools():
    cyl((0, 0, 0), 0.07, 1.8, wood(), verts=10, rot=(0, 40, 0))
    box((0.55, 0, 0.68), (0.25, 0.3, 0.6), steel(), bevel=0.04, rot=(0, 40, 0))
    cyl((0, 0, 0), 0.07, 1.6, steel(), verts=10, rot=(0, -40, 0))
    torus((-0.55, 0, 0.62), 0.18, 0.07, steel(), rot=(90, 0, 0))
    face((-20, 0, 10))


def owl():
    b = mat('#8a6a4a', rough=0.8)
    sphere((0, 0, -0.1), 0.65, b, scale=(1, 0.9, 1.15))
    sphere((0, -0.3, -0.25), 0.4, mat('#e8d8b8', rough=0.8), scale=(1, 0.5, 1))
    for s_ in (-1, 1):
        sphere((s_ * 0.25, -0.5, 0.25), 0.2, mat('#ffffff'))
        sphere((s_ * 0.25, -0.66, 0.25), 0.1, mat('#ffcc2a'), outline=False)
        sphere((s_ * 0.25, -0.73, 0.25), 0.05, mat('#1b1426'), outline=False)
        cyl((s_ * 0.38, 0, 0.72), 0.1, 0.3, b, r2=0.0, rot=(0, s_ * 20, 0))
        sphere((s_ * 0.6, 0.05, -0.15), 0.25, mat('#6a4a30'), scale=(0.5, 0.8, 1.4))
    cyl((0, -0.64, 0.08), 0.06, 0.15, mat('#ffa03a'), r2=0.0, rot=(180, 0, 0))
    box((0.55, -0.45, -0.7), (0.55, 0.05, 0.38), mat('#fbf6ea'), rot=(0, 0, -20))   # a letter for the courier
    face((-10, 0, 10))


def check():
    cyl((0, 0, 0), 0.9, 0.16, mat('#3fb85a', rough=0.4), rot=(90, 0, 0), verts=32)
    seg([(-0.4, -0.12, 0.0), (-0.1, -0.12, -0.3), (0.45, -0.12, 0.35)], 0.1, mat('#ffffff'))
    face()


def clock():
    cyl((0, 0, 0), 0.9, 0.18, mat('#fbf6ea'), rot=(90, 0, 0), verts=32)
    torus((0, -0.1, 0), 0.88, 0.07, gold(), rot=(90, 0, 0))
    for k in range(12):
        a = k * math.pi / 6
        box((0.7 * math.cos(a), -0.12, 0.7 * math.sin(a)), (0.06, 0.02, 0.06), mat('#1b1426'), outline=False)
    box((0, -0.13, 0.22), (0.07, 0.02, 0.45), mat('#1b1426'), outline=False)
    box((0.18, -0.13, 0), (0.36, 0.02, 0.07), mat('#1b1426'), outline=False)
    face()


def wheat():
    g = mat('#e8b84a', rough=0.6)
    for k, a in enumerate((-15, 0, 15)):
        x = math.sin(math.radians(a)) * 0.8
        tube([(0, 0, -1.0), (x * 0.5, 0, 0.0), (x, 0, 0.55)], [0.03, 0.03, 0.02], mat('#c89a3a'))
        for j in range(5):
            for s_ in (-1, 1):
                sphere((x + s_ * 0.07, 0, 0.3 + j * 0.13), 0.08, g, scale=(0.8, 0.8, 1.4))
    face((-10, 0, 0))


def pine():
    cyl((0, 0, -0.75), 0.13, 0.4, wood(), verts=10)
    for k, (r, z) in enumerate(((0.8, -0.35), (0.62, 0.15), (0.42, 0.6))):
        cyl((0, 0, z), r, 0.65, mat('#2f7a3a', rough=0.8), r2=0.0, verts=16)


def mountain():
    rock, snow = mat('#8a8fa0', rough=0.9), mat('#ffffff', rough=0.6)
    cyl((0, 0, -0.2), 0.95, 1.4, rock, r2=0.0, verts=6, smooth=False)
    cyl((0, 0, 0.32), 0.38, 0.37, snow, r2=0.0, verts=6, smooth=False)
    cyl((0.75, 0.2, -0.45), 0.6, 0.9, rock, r2=0.0, verts=6, smooth=False)
    cyl((0.75, 0.2, -0.13), 0.24, 0.27, snow, r2=0.0, verts=6, smooth=False)


def wave():
    # three rolling waves with foam on the crests
    for k, (z, c) in enumerate(((0.45, '#7fc8ff'), (0.0, '#3f9fe8'), (-0.45, '#2f6fc8'))):
        pts = [(-0.95 + i * 0.19, 0, z + 0.16 * math.sin(i * 0.9 + k)) for i in range(11)]
        tube(pts, [0.11] * 11, mat(c, rough=0.2))
        for i in range(1, 11, 3):
            sphere((pts[i][0], -0.1, pts[i][2] + 0.1), 0.07, mat('#ffffff'), outline=False)
    face((-10, 0, 0))


def hole():
    rock = mat('#6a6a7a', rough=0.95)
    for k in range(9):
        a = math.pi * k / 8
        ico((0.8 * math.cos(a), 0, 0.8 * math.sin(a) - 0.3), 0.3, rock, sub=1)
    cyl((0, 0.1, -0.15), 0.62, 0.1, mat('#0a0810'), rot=(90, 0, 0), verts=24, scale=(1, 1, 0.9), outline=False)
    box((0, 0.1, -0.6), (1.6, 0.4, 0.3), rock)
    face((-10, 0, 10))


def snowflake():
    glyph_symbol('frost', 0, s=1.4, m=mat('#bfefff', emit=1.2), r=0.06)
    face((-10, 0, 0))


def telescope():
    brass = mat('#d9a030', rough=0.3, metal=0.8)
    cyl((0, 0, 0.25), 0.16, 1.5, brass, rot=(0, 60, 0), verts=16)
    cyl((0.62, 0, 0.6), 0.22, 0.25, brass, rot=(0, 60, 0), verts=16)
    for a in (0, 120, 240):
        x, y = 0.4 * math.cos(math.radians(a)), 0.4 * math.sin(math.radians(a))
        tube([(0, 0, 0.05), (x, y, -0.9)], [0.04, 0.04], wood())
    group(rot=(0, 0, 10))


def bridge():
    stone = mat('#a8a8b4', rough=0.85)
    box((0, 0, 0.2), (2.0, 0.6, 0.14), wood())
    pts = [(-0.95, 0, -0.75), (-0.5, 0, 0.0), (0, 0, 0.12), (0.5, 0, 0.0), (0.95, 0, -0.75)]
    tube(pts, [0.12] * 5, stone)
    for y in (-0.28, 0.28):
        box((0, y, 0.5), (2.0, 0.05, 0.05), wood())
        for x in (-0.9, -0.3, 0.3, 0.9):
            cyl((x, y, 0.37), 0.03, 0.3, wood(), verts=6)
    face((-10, 0, 10))


def medal(c):
    for s_ in (-1, 1):
        box((s_ * 0.2, 0.05, 0.55), (0.3, 0.04, 0.8), mat('#3f6fd1' if s_ < 0 else '#e8434a'), rot=(0, s_ * 20, 0))
    cyl((0, 0, -0.25), 0.55, 0.14, mat(c, rough=0.25, metal=0.9), rot=(90, 0, 0), verts=32)
    prism(star_pts(5, 0.3, 0.13), 0.06, mat(mix(c, '#ffffff', 0.3), rough=0.3, metal=0.8), loc=(0, -0.1, -0.25))
    face()


def house():
    box((0, 0, -0.35), (1.3, 1.0, 0.95), mat('#f2e3bc', rough=0.8))
    prism([(-0.85, 0), (0.85, 0), (0, 0.65)], 1.15, mat('#c8402a', rough=0.7), loc=(0, 0, 0.12))
    box((0, -0.51, -0.5), (0.3, 0.03, 0.6), wood(), outline=False)
    box((0.4, -0.51, -0.25), (0.25, 0.03, 0.25), mat('#7fd6ff', emit=0.3), outline=False)
    cyl((0.4, 0.2, 0.55), 0.1, 0.4, mat('#8a5a4a'), verts=8)
    group(rot=(0, 0, 20))


def map_icon():
    paper = mat('#f2e3bc', rough=0.85)
    for k in range(3):
        box((-0.6 + k * 0.6, 0, 0), (0.6, 0.04, 1.4), paper, rot=(0, 0, (-1) ** k * 12))
    for k in range(5):
        sphere((-0.6 + k * 0.25, -0.12, -0.3 + math.sin(k) * 0.3), 0.04, mat('#c8402a'), outline=False)
    for a in (45, -45):
        box((0.55, -0.14, 0.35), (0.06, 0.02, 0.3), mat('#c8402a'), rot=(0, a, 0), outline=False)
    face()


def castle():
    stone = mat('#b8b8c4', rough=0.85)
    box((0, 0, -0.4), (1.4, 0.7, 0.8), stone)
    box((0, -0.36, -0.55), (0.35, 0.03, 0.5), mat('#3a2a1a'), outline=False)
    for x in (-0.8, 0.8):
        cyl((x, 0, -0.15), 0.3, 1.3, stone, verts=16)
        cyl((x, 0, 0.62), 0.36, 0.28, mat('#3f6fd1'), r2=0.0, verts=16)
    for x in (-0.45, -0.15, 0.15, 0.45):
        box((x, -0.2, 0.08), (0.16, 0.25, 0.16), stone)
    cyl((0.8, 0, 1.0), 0.02, 0.45, wood(), verts=6)
    box((0.95, 0, 1.12), (0.28, 0.02, 0.16), mat('#e8434a'))
    group(rot=(0, 0, 15))


def basket():
    cyl((0, 0, -0.35), 0.75, 0.7, mat('#b07a40', rough=0.9), r2=0.6, verts=24)
    for k in range(3):
        torus((0, 0, -0.6 + k * 0.22), 0.7 - k * 0.04, 0.03, mat('#8a5a30'), outline=False)
    torus((0, 0, 0.05), 0.55, 0.05, mat('#8a5a30'), rot=(90, 0, 0), scale=(1, 1, 1.2))
    for x, c in ((-0.3, '#e8434a'), (0.05, '#d9a35a'), (0.35, '#5cdc6a')):
        sphere((x, 0, 0.05), 0.2, mat(c, rough=0.5))
    group(rot=(0, 0, 15))


def box_icon():
    box((0, 0, 0), (1.3, 1.0, 1.0), mat('#c8945a', rough=0.85))
    box((0, 0, 0.5), (1.32, 0.25, 0.02), mat('#e8d0a0'), outline=False)
    box((0, -0.5, 0.1), (0.25, 0.02, 0.8), mat('#e8d0a0'), outline=False)
    group(rot=(0, 0, 25))


def spellbook():
    box((0, 0, 0), (1.3, 0.4, 1.6), mat('#5a2a8a', rough=0.6), bevel=0.05)
    box((0.04, 0.0, 0), (1.25, 0.3, 1.5), mat('#f6efdc'), outline=False)
    box((0, -0.21, 0), (1.3, 0.02, 1.6), mat('#5a2a8a', rough=0.6), outline=False)
    for x, z in ((-0.55, 0.7), (0.55, 0.7), (-0.55, -0.7), (0.55, -0.7)):
        box((x, -0.22, z), (0.2, 0.03, 0.2), gold(), outline=False)
    glyph_symbol('void', -0.24, s=0.6, r=0.06)
    face()


def door():
    pts = [(-0.6, -1.0), (0.6, -1.0), (0.6, 0.45)] + [(0.6 * math.cos(math.radians(a)), 0.45 + 0.6 * math.sin(math.radians(a))) for a in range(15, 180, 15)] + [(-0.6, 0.45)]
    prism(pts, 0.15, wood())
    for x in (-0.3, 0, 0.3):
        box((x, -0.09, -0.1), (0.03, 0.02, 1.6), mat('#5a3a20'), outline=False)
    for z in (-0.6, 0.3):
        box((0, -0.1, z), (1.1, 0.03, 0.08), steel(), outline=False)
    sphere((0.38, -0.14, -0.2), 0.07, gold(), outline=False)
    face()


def trophy():
    g = gold(0.15)
    cyl((0, 0, 0.35), 0.62, 0.8, g, r2=0.35, rot=(180, 0, 0), verts=28)
    for s_ in (-1, 1):
        torus((s_ * 0.62, 0, 0.35), 0.22, 0.06, g, rot=(90, 0, 0))
    cyl((0, 0, -0.35), 0.1, 0.45, g, verts=12)
    box((0, 0, -0.7), (0.8, 0.5, 0.25), mat('#5a3a2a'), bevel=0.04)
    prism(star_pts(5, 0.2, 0.08), 0.04, mat('#ffffff', emit=1), loc=(0, -0.45, 0.4))


def eye():
    sphere((0, 0, 0), 0.75, mat('#ffffff', rough=0.3), scale=(1.3, 0.5, 0.8))
    cyl((0, -0.32, 0), 0.38, 0.06, mat('#4fa0e8'), rot=(90, 0, 0), verts=24, outline=False)
    cyl((0, -0.36, 0), 0.18, 0.04, mat('#1b1426'), rot=(90, 0, 0), verts=20, outline=False)
    sphere((-0.12, -0.4, 0.12), 0.06, glow('#ffffff', 4), outline=False)
    face((-10, 0, 0))


def eagle():
    b = mat('#6a4a30', rough=0.8)
    sphere((0, 0, -0.1), 0.42, b, scale=(0.8, 0.8, 1.2))
    sphere((0, -0.1, 0.45), 0.25, mat('#ffffff'))
    cyl((0, -0.35, 0.42), 0.08, 0.25, mat('#ffcc2a'), r2=0.0, rot=(90, 0, 0))
    for s_ in (-1, 1):
        for k in range(3):
            sphere((s_ * (0.5 + k * 0.25), 0.05, 0.15 + k * 0.12), 0.3, b, scale=(1.3, 0.25, 0.5), rot=(0, s_ * (-15 - k * 12), 0))
        sphere((s_ * 0.08, -0.32, 0.5), 0.04, mat('#1b1426'), outline=False)
    face((-10, 0, 0))


def sprout():
    sphere((0, 0, -0.7), 0.7, mat('#7a5230', rough=0.95), scale=(1, 1, 0.4))
    tube([(0, 0, -0.5), (0, 0, 0.0), (0.05, 0, 0.3)], [0.05, 0.05, 0.04], mat('#4fa64a'))
    for s_ in (-1, 1):
        sphere((s_ * 0.35, 0, 0.35), 0.3, mat('#5cdc6a', rough=0.5), scale=(1.3, 0.3, 0.6), rot=(0, s_ * -25, 0))
    face((-10, 0, 0))


def tornado():
    for k in range(6):
        torus((0.05 * math.sin(k), 0, -0.75 + k * 0.3), 0.15 + k * 0.13, 0.05, mat('#b8c8d8', emit=0.3), rot=(0, 0, 0), outline=(k == 5))
    group(rot=(15, 0, 0))


def star():
    prism(star_pts(5, 0.95, 0.4), 0.22, gold(0.8))
    prism(star_pts(5, 0.55, 0.23), 0.06, glow('#fff1a8', 3), loc=(0, -0.13, 0))
    face()


def axe():
    cyl((0, 0, -0.1), 0.12, 1.9, wood(), verts=12, rot=(0, 20, 0))
    prism([(0, 0.3), (0.75, 0.6), (0.85, 0.0), (0.75, -0.6), (0, -0.3)], 0.16, steel(), loc=(0.2, 0, 0.55))
    group(rot=(0, -10, 15))


def hammer():
    cyl((0, 0, -0.2), 0.07, 1.7, wood(), verts=12)
    box((0, 0, 0.7), (1.0, 0.4, 0.4), steel(), bevel=0.05)
    group(rot=(0, 30, 15))


def saw():
    pts = [(-0.5, 0.25), (0.95, 0.12), (0.95, -0.12)] + [(0.95 - k * 0.12, -0.12 - (0.08 if k % 2 == 0 else 0)) for k in range(12)] + [(-0.5, -0.25)]
    prism(pts, 0.04, steel())
    box((-0.75, 0, 0), (0.5, 0.15, 0.55), wood(), bevel=0.08)
    group(rot=(-20, 0, 25))


def tub():
    w = mat('#8a5a35', rough=0.8)
    cyl((0, 0, -0.2), 0.85, 0.85, w, r2=0.75, verts=24)
    for z in (-0.5, 0.05):
        torus((0, 0, z), 0.83 if z < 0 else 0.78, 0.04, steel())
    cyl((0, 0, 0.18), 0.72, 0.05, mat('#6a3a1a', rough=0.2), verts=24, outline=False)
    prism([(-0.3, 0), (0.3, 0.05), (0.45, 0.5), (-0.2, 0.55)], 0.04, mat('#c89a6a'), loc=(0.2, -0.1, 0.25))
    group(rot=(10, 0, 15))


def yarn():
    m = mat('#e8434a', rough=0.9)
    sphere((0, 0, 0), 0.7, m)
    for k in range(5):
        torus((0, 0, 0), 0.7, 0.03, mat('#c83030'), rot=(k * 36, 60, 0), outline=False)
    tube([(0.5, -0.4, -0.3), (0.9, -0.5, -0.6), (1.1, -0.4, -0.9)], [0.04, 0.03, 0.03], m)
    for s_ in (-1, 1):
        cyl((s_ * 0.25, -0.2, 0.6), 0.03, 1.2, steel(), rot=(0, s_ * 30, 0), verts=8)


def pan():
    m = mat('#3a3a44', rough=0.4, metal=0.6)
    cyl((0, 0, 0), 0.75, 0.15, m, verts=32)
    cyl((0, 0, 0.07), 0.65, 0.04, mat('#2a2a30'), verts=32, outline=False)
    box((1.15, 0, 0.05), (0.8, 0.14, 0.08), wood(), bevel=0.03)
    sphere((0, 0, 0.12), 0.42, mat('#ffffff'), scale=(1, 1, 0.12), outline=False)
    sphere((0.05, 0, 0.17), 0.16, mat('#ffcc2a'), scale=(1, 1, 0.5))
    group(rot=(35, 0, 15))


def alembic():
    glass = mat('#cfe8ff', rough=0.05, alpha=0.4)
    sphere((0, 0, -0.35), 0.55, glass)
    sphere((0, 0, -0.42), 0.48, mat('#5cdc6a', emit=0.8, alpha=0.8), scale=(1, 1, 0.6), outline=False)
    cyl((0, 0, 0.35), 0.14, 0.5, glass, verts=16)
    tube([(0, 0, 0.6), (0.4, 0, 0.75), (0.9, 0, 0.3)], [0.06, 0.05, 0.04], glass)
    cyl((0, 0, 0.62), 0.16, 0.08, wood(), verts=16)
    for _ in range(3):
        sphere((R.uniform(-0.2, 0.2), -0.3, R.uniform(-0.5, -0.2)), 0.06, glow('#d8ffd0', 3), outline=False)


def bow():
    pts = [(0.1, 0, 1.0), (0.5, 0, 0.6), (0.62, 0, 0.0), (0.5, 0, -0.6), (0.1, 0, -1.0)]
    tube(pts, [0.07, 0.13, 0.15, 0.13, 0.07], mat('#b8723a', rough=0.6))
    for z in (1.0, -1.0):
        sphere((0.1, 0, z), 0.1, gold())
    tube([(0.1, 0, 1.0), (0.1, 0, -1.0)], [0.02, 0.02], mat('#f5efe0'), outline=False)
    cyl((0.62, 0, 0), 0.17, 0.4, mat('#5a3d22'), verts=12)
    cyl((-0.1, 0, 0), 0.04, 1.6, wood(), rot=(0, 90, 0), verts=8)           # arrow
    cyl((-0.95, 0, 0), 0.1, 0.22, steel(), r2=0.0, rot=(0, -90, 0), verts=8)
    for z in (0.08, -0.08):
        box((0.62, 0, z), (0.25, 0.02, 0.1), mat('#e8434a'), outline=False)
    group(rot=(0, -30, 10))


ICONS = {
    'bow': bow, 'coin': coin, 'gem': gem, 'scroll': scroll, 'backpack': backpack, 'bank': bank, 'heart': heart, 'swords': swords,
    'shield': shield, 'grace': grace, 'lock': lock, 'crown': crown, 'flame': flame, 'skull': skull, 'sparkle': sparkle,
    'warning': warning, 'hourglass': hourglass, 'books': books, 'clipboard': clipboard, 'plate': plate, 'speaker': speaker,
    'mute': mute, 'withdraw': withdraw, 'fist': fist, 'foot': foot, 'arena': arena, 'puzzle': puzzle, 'burst': burst,
    'dizzy': dizzy, 'coffin': coffin, 'tree': tree, 'portal': portal, 'pickaxe': pickaxe, 'rod': rod, 'target': target,
    'muscle': muscle, 'lightning': lightning, 'tombstone': tombstone, 'wind': wind, 'shop': shop, 'up': up, 'tools': tools,
    'owl': owl, 'check': check, 'clock': clock, 'wheat': wheat, 'pine': pine, 'mountain': mountain, 'wave': wave,
    'hole': hole, 'snowflake': snowflake, 'telescope': telescope, 'bridge': bridge,
    'medal_bronze': lambda: medal('#c87533'), 'medal_silver': lambda: medal('#c8d0da'), 'medal_gold': lambda: medal(GOLD),
    'house': house, 'map': map_icon, 'castle': castle, 'basket': basket, 'box': box_icon, 'spellbook': spellbook,
    'door': door, 'trophy': trophy, 'eye': eye, 'eagle': eagle, 'sprout': sprout, 'tornado': tornado, 'star': star,
    'axe': axe, 'hammer': hammer, 'saw': saw, 'tub': tub, 'yarn': yarn, 'pan': pan, 'alembic': alembic,
}


def build(name):
    R.seed(sum(map(ord, name)))
    reset(transparent=True, samples=24)
    world_color('#9a94b8', 0.8)
    ICONS[name]()
    add_outlines(0.035)
    sun((48, 0, -35), 3.0, '#fff4e0')
    sun((65, 0, 110), 1.0, '#c9d8ff')
    sun((-120, 0, 15), 1.6, '#ffe6c0')
    cam = camera((3.0, -6.0, 4.5), (0, 0, 0), ortho=3)
    frame_ortho(cam, 1.08)
    render(os.path.join(OUT, name + '.webp'), 96, 96, quality=88)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n in [a for a in sys.argv[1:] if not a.startswith('-')] or list(ICONS):
        build(n)
        print('rendered', n, flush=True)
