"""Renders an icon for every item to assets/items/<item id>.webp.

Every item in the game (materials, gear, food, potions, and future monster drops) gets
a model here that looks like its name. When you add an item to js/skilldata.js or js/content.js,
add a builder to ITEMS below and render it:

    python art/blender/items.py              # all items
    python art/blender/items.py log3 pot0    # only these
    node art/check-item-icons.js             # lists items that have no icon yet
"""
import os
import sys
import math
import random
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

OUT = os.path.join(ROOT, 'assets', 'items')
R = random.Random(5)


def glow(c, s=3):
    return mat(c, emit=s)


def metal(c, rough=0.28):
    return mat(c, rough=rough, metal=0.9)


def group(rot=(0, 0, 0), loc=(0, 0, 0)):
    """Parent every object to an empty and rotate the whole item."""
    bpy.ops.object.empty_add(location=(0, 0, 0))
    pivot = bpy.context.object
    for o in bpy.context.scene.objects:
        if o is not pivot and o.parent is None and o.type in ('MESH', 'LIGHT'):
            o.parent = pivot
    pivot.rotation_euler = [math.radians(a) for a in rot]
    pivot.location = loc
    return pivot


# ---------------- materials ----------------
def log(bark, wood, ring, glow_c=None, marks=None, stub=True):
    cyl((0, 0, 0), 0.45, 1.8, mat(bark, rough=0.9), rot=(0, 90, 0), verts=14)
    for x in (0.9, -0.9):
        cyl((x, 0, 0), 0.41, 0.03, mat(wood), rot=(0, 90, 0), verts=24, outline=False)
        for r in (0.12, 0.24, 0.34):
            torus((x * 1.012, 0, 0), r, 0.012, mat(ring), rot=(0, 90, 0), outline=False)
        if glow_c:
            cyl((x * 1.02, 0, 0), 0.12, 0.02, glow(glow_c, 5), rot=(0, 90, 0), verts=16, outline=False)
    if marks:
        for _ in range(9):
            a = R.uniform(-1.2, 1.2)
            box((R.uniform(-0.75, 0.75), -0.45 * math.cos(a), 0.45 * math.sin(a)), (0.18, 0.03, 0.05), mat(marks), rot=(math.degrees(a), 0, 0), outline=False)
    if stub:
        cyl((0.25, 0, 0.5), 0.1, 0.3, mat(bark, rough=0.9), rot=(0, -20, 0), verts=8)
    group(rot=(0, 0, -38))  # turn a cut end toward the camera so the rings show


def ore(rock_c, nug_c, metallic=True, emit=0, sparkle=None):
    ico((0, 0, 0), 0.8, mat(rock_c, rough=0.95), scale=(1.15, 1, 0.8), sub=1)
    for i in range(7):
        a, z = i * 0.9 + R.uniform(-0.2, 0.2), R.uniform(0.0, 0.55)
        r = math.sqrt(max(0.05, 0.75 ** 2 - z ** 2)) * 0.97
        m = mat(nug_c, rough=0.25, metal=0.9 if metallic else 0, emit=emit)
        ico((r * 1.15 * math.cos(a), r * math.sin(a), z * 0.8), R.uniform(0.14, 0.24), m, sub=1)
    if sparkle:
        for _ in range(5):
            sphere((R.uniform(-0.7, 0.7), R.uniform(-0.6, 0.6), R.uniform(0.3, 0.7)), 0.05, glow(sparkle, 8), outline=False)


def fish_body(body, belly, fin, length=1.8, height=0.8, eye='#1b1426'):
    sphere((0, 0, 0), 0.5, mat(body), scale=(length, 0.55, height))
    sphere((0.05, -0.05, -0.12), 0.45, mat(belly), scale=(length * 0.85, 0.5, 0.5 * height), outline=False)
    cyl((-0.5 * length - 0.25, 0, 0), 0.38, 0.55, mat(fin), r2=0.0, rot=(0, 90, 0), scale=(1, 0.12, 1), verts=3)
    cyl((-0.05, 0, 0.36 * height + 0.12), 0.25, 0.35, mat(fin), r2=0.0, scale=(1.4, 0.12, 1), verts=3)
    sphere((0.38 * length, -0.24, 0.08), 0.07, mat(eye, rough=0.2), outline=False)
    sphere((0.38 * length + 0.01, -0.29, 0.1), 0.025, glow('#ffffff', 2), outline=False)


def minnow():
    fish_body('#a8b4c0', '#e8eef5', '#8a96a8', length=1.7, height=0.6)
    sphere((0, -0.27, 0.0), 0.4, mat('#6fa0c8'), scale=(1.6, 0.05, 0.12), outline=False)
    group(rot=(0, 0, -20))


def trout():
    fish_body('#7a8a4a', '#f0e0c8', '#6b7a3a', length=1.9, height=0.75)
    sphere((0, -0.27, 0.02), 0.4, mat('#e88aa0'), scale=(1.7, 0.06, 0.18), outline=False)
    for _ in range(12):
        sphere((R.uniform(-0.6, 0.6), -0.27, R.uniform(0.05, 0.3)), 0.04, mat('#2a2a1a'), scale=(1, 0.4, 1), outline=False)
    group(rot=(0, 0, -20))


def spinefin():
    sphere((0, 0, 0), 0.65, mat('#f2c14e'))
    sphere((0, -0.05, -0.2), 0.55, mat('#fff1c8'), scale=(1, 1, 0.5), outline=False)
    for i in range(26):
        a, b = R.uniform(0, 6.28), R.uniform(-1.2, 1.3)
        d = (math.cos(b) * math.cos(a), math.cos(b) * math.sin(a), math.sin(b))
        o = cyl((d[0] * 0.66, d[1] * 0.66, d[2] * 0.66), 0.05, 0.25, mat('#8a6a2a'), r2=0.0, verts=6)
        o.rotation_euler = Vector(d).to_track_quat('Z', 'Y').to_euler()
    cyl((-0.85, 0, 0), 0.3, 0.4, mat('#e0a838'), r2=0.0, rot=(0, 90, 0), scale=(1, 0.15, 1), verts=3)
    for s in (-1, 1):
        sphere((0.4, -0.45, 0.2 * s + 0.15), 0.1, mat('#1b1426', rough=0.2), outline=False) if s > 0 else None
    sphere((0.42, -0.5, 0.25), 0.11, mat('#ffffff'), outline=False)
    sphere((0.45, -0.58, 0.26), 0.06, mat('#1b1426'), outline=False)
    sphere((0.62, -0.3, -0.05), 0.08, mat('#e86a4a'), outline=False)
    group(rot=(0, 0, -25))


def shark():
    fish_body('#7f8a96', '#eef2f6', '#6f7a86', length=2.4, height=0.7)
    cyl((0.0, 0, 0.55), 0.35, 0.6, mat('#6f7a86'), r2=0.0, scale=(1.2, 0.12, 1), verts=3, rot=(0, -15, 0))
    cyl((-1.45, 0, 0.25), 0.3, 0.9, mat('#6f7a86'), r2=0.0, scale=(1, 0.12, 1), verts=3, rot=(0, -40, 0))
    for s in (-1, 1):
        cyl((0.4, s * 0.3, -0.25), 0.2, 0.5, mat('#6f7a86'), r2=0.0, scale=(1.2, 0.2, 1), verts=3, rot=(s * 60, 0, 0))
    for i in range(3):
        box((0.62 - i * 0.07, -0.27, 0.0), (0.02, 0.02, 0.16), mat('#4f5a66'), outline=False)
    group(rot=(0, 0, -20))


def eel():
    pts, rad = [], []
    for i in range(16):
        t = i / 15
        a = t * 3.6 * math.pi
        r = 0.75 - 0.35 * t
        pts.append((r * math.cos(a), r * math.sin(a), 0.1 + t * 0.6))
        rad.append(0.2 - 0.06 * t)
    tube(pts, rad, mat('#2f5a3f'), res=6)
    head = pts[-1]
    sphere((head[0] + 0.05, head[1], head[2] + 0.12), 0.24, mat('#2f5a3f'), scale=(1.4, 1, 0.9))
    sphere((head[0] + 0.2, head[1] - 0.17, head[2] + 0.2), 0.06, glow('#d1ff3a', 5), outline=False)
    for i in range(0, 16, 2):
        sphere((pts[i][0], pts[i][1], pts[i][2] + rad[i] * 0.8), 0.06, mat('#d1ff3a', emit=1), outline=False)


# ---------------- herbs ----------------
def mintleaf():
    tube([(0, 0, -0.6), (0.05, 0, 0.1), (0, 0, 0.7)], [0.04, 0.035, 0.02], mat('#3f7a3a'))
    for i, z in enumerate((-0.25, 0.1, 0.45)):
        for s in (-1, 1):
            sphere((s * 0.3, 0, z), 0.28, mat('#5cc46a'), scale=(1.2, 0.25, 0.7), rot=(0, s * -30, 90 * (i % 2)))
    sphere((0, 0, 0.75), 0.18, mat('#7fdc7a'), scale=(0.8, 0.25, 1.1))


def sunpetal():
    tube([(0, 0, -0.9), (0, 0, 0.2)], [0.04, 0.04], mat('#3f7a3a'))
    for i in range(10):
        a = i * 36
        sphere((0.42 * math.cos(math.radians(a)), 0.42 * math.sin(math.radians(a)) * 0.3, 0.35 + 0.42 * math.sin(math.radians(a)) * 0.95),
               0.22, mat('#ffd84a'), scale=(1.6, 0.25, 0.7), rot=(90, 0, a) if False else (0, -a, 0))
    sphere((0, -0.08, 0.35), 0.2, mat('#c8742a'), scale=(1, 0.5, 1))
    sphere((0.3, 0, -0.5), 0.2, mat('#5cc46a'), scale=(1.6, 0.2, 0.6), rot=(0, -30, 0))


def moonbloom():
    tube([(0, 0, -0.9), (0.1, 0, -0.1), (0, 0, 0.25)], [0.04, 0.035, 0.03], mat('#3f6a5a'))
    for i in range(5):
        a = i * 72
        o = sphere((0.25 * math.cos(math.radians(a)), 0.25 * math.sin(math.radians(a)), 0.55), 0.26,
                   mat('#cfe6ff', emit=0.8), scale=(0.6, 0.6, 1.3), rot=(0, 35, a))
    sphere((0, 0, 0.45), 0.12, glow('#9fdcff', 6), outline=False)
    sphere((-0.3, 0, -0.45), 0.2, mat('#4f8a7a'), scale=(1.6, 0.2, 0.6), rot=(0, 30, 0))


def dragonroot():
    for s, ang in ((-1, -20), (0, 0), (1, 22)):
        tube([(s * 0.12, 0, 0.5), (s * 0.3, 0, 0.0), (s * 0.2 - 0.1, 0, -0.5), (s * 0.35, 0, -0.85)],
             [0.17, 0.15, 0.09, 0.01], mat('#d93a2a', rough=0.35))
    for a in (0, 120, 240):
        sphere((0.12 * math.cos(math.radians(a)), 0.12 * math.sin(math.radians(a)), 0.7), 0.15, mat('#4fa64a'), scale=(0.7, 0.4, 1.4), rot=(0, 20, a))


def starmoss():
    for _ in range(9):
        sphere((R.uniform(-0.55, 0.55), R.uniform(-0.4, 0.4), R.uniform(-0.15, 0.2)), R.uniform(0.25, 0.4),
               mat(R.choice(('#7a5ad1', '#5a8a5a', '#8f6ae0'))), seg=12, rings=8)
    for _ in range(9):
        sphere((R.uniform(-0.6, 0.6), R.uniform(-0.6, -0.2), R.uniform(0.1, 0.55)), 0.045, glow('#fff1a8', 8), outline=False)


# ---------------- smithing ----------------
METAL = ['#c87533', '#8f959e', '#e2e8ef', '#3fd0c0', '#9b6cff', '#4a2e3e', '#ffbf4a', '#3a3aa0']
METAL_EMIT = [0, 0, 0, 0.5, 1.2, 0.4, 0.8, 1.4]
GEM = ['#ffb04a', '#9fdcff', '#7fd6ff', '#3fd0c0', '#ff9af0', '#ff5a3a', '#fff1a8', '#b48cff']  # inlaid gems by tier


def bar(i):
    m = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i])
    for dy, dz in ((0, 0), (0.95, 0)):
        box((0, dy - 0.45, dz), (1.6, 0.8, 0.42), m, bevel=0.1)
        box((0, dy - 0.45, dz + 0.24), (1.25, 0.52, 0.08), m, bevel=0.03)
    box((0.0, -0.2, 0.6), (1.6, 0.8, 0.42), m, bevel=0.1, rot=(0, 0, 90))
    group(rot=(0, 0, 20))


GUARD = ['#8a5a35', '#4f5a66', '#f2c14e', '#2a8a80', '#6a3fc0', '#ff5a3a', '#fff1a8', '#9b6cff']
POMMEL = ['#c87533', '#8f959e', '#f2c14e', '#3fd0c0', '#ffd84a', '#ff5a3a', '#ffd84a', '#c8a8ff']


def melee(i, length=1.7, width=0.2, grip=0.5, guard=0.75, curve_guard=False):
    """Blade weapons: dagger, short sword, long sword and 2H sword share this, scaled."""
    m = mat(METAL[i], rough=0.2, metal=0.9, emit=METAL_EMIT[i])
    base = -0.3
    box((0, 0, base + length / 2), (width, 0.05, length), m)
    cyl((0, 0, base + length + width * 0.45), width * 0.7, width * 1.25, m, r2=0.0, verts=4, scale=(1, 0.3, 1), rot=(0, 0, 45))
    box((0, 0, base + length / 2), (width * 0.2, 0.06, length * 0.88), mat('#ffffff', rough=0.1, metal=0.5), outline=False)
    box((0, 0, base - 0.05), (guard, 0.14, 0.12), mat(GUARD[i], rough=0.3, metal=0.7), bevel=0.03)
    if curve_guard:
        for s_ in (-1, 1):
            sphere((s_ * guard / 2, 0, base - 0.02), 0.09, mat(GUARD[i], rough=0.3, metal=0.7))
    cyl((0, 0, base - 0.1 - grip / 2), 0.07, grip, mat('#5a3d22'))
    for k in range(int(grip / 0.12)):
        torus((0, 0, base - 0.16 - k * 0.12), 0.075, 0.015, mat('#3a2614'), outline=False)
    sphere((0, 0, base - 0.12 - grip), 0.11, mat(POMMEL[i], rough=0.3, metal=0.8, emit=METAL_EMIT[i]))
    if i >= 3:
        sphere((0, -0.06, base - 0.05), 0.07, glow(GEM[i], 5), outline=False)
    group(rot=(0, 45, 0))


def blade(i):   # short sword
    melee(i)


def dagger(i):
    melee(i, length=0.8, width=0.17, grip=0.32, guard=0.45)


def longsword(i):
    melee(i, length=2.3, width=0.2, grip=0.7, guard=0.9, curve_guard=True)


def greatsword(i):
    melee(i, length=2.8, width=0.34, grip=1.0, guard=1.25, curve_guard=True)


def plate(i):
    m = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i] * 0.6)
    cyl((0, 0, 0), 0.62, 1.15, m, r2=0.5, verts=24, scale=(1, 0.62, 1))
    for s in (-1, 1):
        sphere((s * 0.62, 0, 0.42), 0.32, m, scale=(1, 0.9, 0.6))
    cyl((0, 0, 0.58), 0.25, 0.05, mat('#1b1426'), scale=(1, 0.7, 1), outline=False)
    torus((0, 0, -0.42), 0.6, 0.06, mat('#5a3d22'), scale=(1, 0.64, 1))
    sphere((0, -0.4, 0.15), 0.1, glow(GEM[i], 3 if i > 1 else 1), outline=False)
    box((0, -0.38, 0.0), (0.06, 0.02, 0.9), mat(METAL[i], rough=0.4, metal=0.6), outline=False)


# ---------------- cooking ----------------
def plate_dish(r=0.95):
    cyl((0, 0, -0.35), r, 0.08, mat('#f4f0e8', rough=0.3), verts=40)
    torus((0, 0, -0.31), r - 0.05, 0.04, mat('#d8d2c8', rough=0.3), outline=False)


def grilled_minnow():
    cyl((0, 0, 0), 0.03, 2.2, mat('#c9a66b'), rot=(0, 70, 0))
    for x in (-0.4, 0.4):
        sphere((x, 0, x * 0.36), 0.25, mat('#b8743a', rough=0.5), scale=(1.5, 0.5, 0.6), rot=(0, -20, 0))
        for k in range(3):
            box((x - 0.15 + k * 0.15, -0.13, x * 0.36), (0.03, 0.02, 0.25), mat('#4a2a14'), outline=False)


def baked_trout():
    plate_dish()
    sphere((0, 0, -0.15), 0.32, mat('#c8783a', rough=0.45), scale=(2.2, 0.9, 0.5))
    cyl((-0.85, 0, -0.15), 0.25, 0.4, mat('#a8602a'), r2=0.0, rot=(0, 90, 0), scale=(1, 0.2, 1), verts=3)
    cyl((0.55, -0.45, -0.25), 0.2, 0.04, mat('#ffe66b'), verts=16)
    sphere((-0.3, -0.35, -0.2), 0.12, mat('#4fa64a'), scale=(1.4, 0.6, 0.4))


def stew():
    sphere((0, 0, -0.1), 0.85, mat('#8a5a35', rough=0.4), scale=(1, 1, 0.55))
    cyl((0, 0, 0.12), 0.74, 0.04, mat('#c8742a', rough=0.3), verts=32, outline=False)
    for _ in range(7):
        sphere((R.uniform(-0.45, 0.45), R.uniform(-0.45, 0.45), 0.16), R.uniform(0.08, 0.14), mat(R.choice(('#f2c14e', '#e86a4a', '#5cc46a', '#f0e0c8'))), outline=False)
    cyl((0.5, -0.1, 0.45), 0.05, 1.0, mat('#c9cfd8', metal=0.8, rough=0.3), rot=(0, 35, 0))
    for _ in range(3):
        sphere((R.uniform(-0.3, 0.3), 0, R.uniform(0.6, 1.0)), 0.12, mat('#ffffff', emit=0.6, alpha=0.35), outline=False)


def steak():
    plate_dish()
    box((0, 0, -0.15), (1.1, 0.8, 0.28), mat('#a8503a', rough=0.5), bevel=0.15)
    for k in range(4):
        box((-0.36 + k * 0.24, 0, 0.0), (0.05, 0.85, 0.02), mat('#3a1a10'), rot=(0, 0, 30), outline=False)
    sphere((0.6, -0.45, -0.22), 0.15, mat('#4fa64a'), scale=(1.4, 0.6, 0.4))


def eel_feast():
    cyl((0, 0, -0.35), 1.0, 0.08, mat('#d9b46b', rough=0.3, metal=0.6), verts=40, scale=(1.3, 0.85, 1))
    pts = [(0.6 * math.cos(t), 0.4 * math.sin(t), -0.15 + 0.03 * t) for t in [i * 0.55 for i in range(18)]]
    tube(pts, [0.15] * 17 + [0.05], mat('#8a4a2a', rough=0.35), res=6)
    for _ in range(6):
        sphere((R.uniform(-0.9, 0.9), R.uniform(-0.5, 0.5), -0.2), 0.09, mat(R.choice(('#4fa64a', '#e8434a', '#ffe66b'))), outline=False)


def bread():
    sphere((0, 0, 0), 0.6, mat('#d9a35a', rough=0.6), scale=(1.6, 0.95, 0.75))
    sphere((0, 0, -0.18), 0.6, mat('#b8803a', rough=0.7), scale=(1.65, 1.0, 0.45), outline=False)
    for k in range(3):
        box((-0.45 + k * 0.45, 0, 0.42), (0.1, 0.55, 0.05), mat('#f2d6a0'), rot=(0, 0, 25), outline=False)


def burnt():
    for _ in range(6):
        ico((R.uniform(-0.35, 0.35), R.uniform(-0.25, 0.25), R.uniform(-0.15, 0.15)), R.uniform(0.3, 0.45), mat('#241a16', rough=0.95), sub=1)
    for _ in range(4):
        sphere((R.uniform(-0.3, 0.3), R.uniform(-0.3, 0), R.uniform(0.0, 0.2)), 0.05, glow('#ff6a1a', 4), outline=False)
    for k in range(3):
        sphere((0.1 * k - 0.1, 0, 0.6 + k * 0.3), 0.18 + k * 0.05, mat('#9a9a9a', emit=0.2, alpha=0.4), outline=False)


# ---------------- alchemy ----------------
def potion(liquid, emit=0.6, glow_extra=False):
    sphere((0, 0, -0.15), 0.62, mat(liquid, rough=0.12, emit=emit))                       # the filled flask
    sphere((0, -0.05, 0.25), 0.5, mat('#ffffff', emit=0.3, alpha=0.25), scale=(1, 1, 0.35), outline=False)  # air gap / glass top
    cyl((0, 0, 0.6), 0.17, 0.55, mat('#d8ecff', rough=0.05))
    cyl((0, 0, 0.92), 0.19, 0.22, mat('#a8743a', rough=0.8))
    torus((0, 0, 0.45), 0.2, 0.04, mat('#c9a14a', metal=0.8, rough=0.3), outline=False)
    sphere((-0.22, -0.48, 0.1), 0.1, glow('#ffffff', 2), scale=(0.6, 0.3, 1.3), outline=False)
    if glow_extra:
        for _ in range(5):
            sphere((R.uniform(-0.6, 0.6), R.uniform(-0.6, 0), R.uniform(0.2, 1.0)), 0.04, glow('#fff1a8', 8), outline=False)


# ---------------- crafting gear (metalworking, carpentry, glassworking) ----------------
WOOD = ['#c8935a', '#efe2c4', '#b8523a', '#c8ccd4', '#5a3a4a', '#4a4a52', '#9a2a2a', '#d8e8b8']
ORB = ['#5cdc6a', '#ffb02e', '#cfe6ff', '#ff4a2a', '#b48cff', '#ff6a2a', '#9fe8ff', '#8a4aff']


def prism(points, depth, m, loc=(0, 0, 0)):
    """Extrude a 2D outline (x, z points) along y: used for kite shields."""
    n = len(points)
    verts = [(x, -depth / 2, z) for x, z in points] + [(x, depth / 2, z) for x, z in points]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))] + [[i, (i + 1) % n, (i + 1) % n + n, i + n] for i in range(n)]
    me = bpy.data.meshes.new('prism')
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new('prism', me)
    o.location = loc
    bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    o['outline'] = True
    return o


def sand():
    cyl((0, 0, -0.2), 0.95, 0.6, mat('#e2cf9a', rough=1), r2=0.15, verts=24)
    for _ in range(14):
        sphere((R.uniform(-0.6, 0.6), R.uniform(-0.6, 0.2), R.uniform(-0.1, 0.2)), 0.05, mat('#c9b47a'), outline=False)


def molten_glass():
    sphere((0, 0, 0), 0.6, mat('#bfe6ff', rough=0.05), scale=(1.2, 1, 0.8))
    sphere((0, -0.1, 0.05), 0.35, glow('#ff8a2a', 5), outline=False)
    sphere((-0.25, -0.45, 0.25), 0.1, glow('#ffffff', 2), scale=(0.6, 0.3, 1), outline=False)


def vial():
    cyl((0, 0, -0.1), 0.28, 1.2, mat('#d8ecff', rough=0.05), verts=20)
    sphere((0, 0, -0.7), 0.28, mat('#d8ecff', rough=0.05))
    cyl((0, 0, 0.6), 0.22, 0.25, mat('#a8743a', rough=0.8))
    sphere((-0.12, -0.25, 0.0), 0.06, glow('#ffffff', 2), scale=(0.5, 0.3, 3), outline=False)
    group(rot=(0, 15, 0))


def plank(i):
    for k, (dz, dx) in enumerate(((0, 0), (0.24, 0.12), (0.48, -0.08))):
        box((dx, 0, dz), (1.9, 0.55, 0.2), mat(WOOD[i], rough=0.8), rot=(0, 0, k * 8 - 8), bevel=0.03)
        for g in range(3):
            box((dx + R.uniform(-0.6, 0.6), -0.28, dz), (0.5, 0.01, 0.025), mat('#00000033' if False else '#7a5a3a'), outline=False)
    group(rot=(0, 0, 20))


def bow(i):
    pts = [(0.15, 0, 1.2), (0.5, 0, 0.7), (0.62, 0, 0.0), (0.5, 0, -0.7), (0.15, 0, -1.2)]
    tube(pts, [0.03, 0.07, 0.09, 0.07, 0.03], mat(WOOD[i], rough=0.6))
    tube([(0.15, 0, 1.2), (0.15, 0, -1.2)], [0.012, 0.012], mat('#f5efe0'), outline=False)
    cyl((0.62, 0, 0), 0.11, 0.35, mat('#5a3d22'))
    if i >= 2:
        for z in (0.8, -0.8):
            sphere((0.48, -0.05, z), 0.07, glow(ORB[i], 4), outline=False)
    group(rot=(0, -30, 0))


def staff(i):
    cyl((0, 0, -0.2), 0.06, 2.3, mat(WOOD[i], rough=0.6))
    for a in range(3):
        tube([(0, 0, 0.85), (0.22 * math.cos(a * 2.1), 0.22 * math.sin(a * 2.1), 1.05), (0.12 * math.cos(a * 2.1), 0.12 * math.sin(a * 2.1), 1.3)],
             [0.05, 0.04, 0.02], mat(WOOD[i], rough=0.6))
    sphere((0, 0, 1.12), 0.2, mat(ORB[i], emit=3), outline=False)
    torus((0, 0, -0.1), 0.08, 0.025, mat('#c9a14a', metal=0.8, rough=0.3), outline=False)
    group(rot=(0, 35, 0))


def wshield(i):
    cyl((0, 0, 0), 0.9, 0.14, mat(WOOD[i], rough=0.8), rot=(90, 0, 0), verts=36)
    for x in (-0.45, 0, 0.45):
        box((x, -0.08, 0), (0.03, 0.02, 1.6), mat('#5a3d22'), outline=False)
    torus((0, -0.02, 0), 0.9, 0.06, mat('#9aa4ae', metal=0.8, rough=0.3), rot=(90, 0, 0))
    sphere((0, -0.1, 0), 0.2, mat('#9aa4ae', metal=0.8, rough=0.3), scale=(1, 0.6, 1))
    group(rot=(0, 0, -25))


def orb(i):
    cyl((0, 0, -0.62), 0.4, 0.25, mat('#5a3d22'), r2=0.25, verts=16)
    sphere((0, 0, 0.05), 0.6, mat(ORB[i], rough=0.05, emit=0.6))
    sphere((0.05, -0.1, 0.05), 0.3, glow(ORB[i], 6), outline=False)
    sphere((-0.22, -0.48, 0.3), 0.09, glow('#ffffff', 3), scale=(0.6, 0.3, 1), outline=False)


def helm(i):
    m = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i] * 0.5)
    sphere((0, 0, 0.1), 0.7, m, scale=(1, 1, 1.05))
    box((0, -0.62, -0.05), (0.62, 0.2, 0.36), mat('#120d18'), outline=False)
    box((0, -0.7, 0.1), (0.1, 0.1, 0.55), m)
    cyl((0, 0, -0.5), 0.72, 0.18, m, verts=28)
    if i >= 3:
        tube([(0, 0.1, 0.75), (0, 0.4, 0.95), (0, 0.75, 0.8)], [0.1, 0.12, 0.04], mat(GEM[i]))


def gauntlet(i):
    m = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i] * 0.5)
    cyl((0, 0, -0.55), 0.38, 0.55, m, r2=0.32, verts=20)
    box((0, 0, 0.05), (0.62, 0.32, 0.6), m, bevel=0.08)
    for k in range(4):
        cyl((-0.22 + k * 0.15, 0, 0.55), 0.06, 0.4, m, verts=10)
    cyl((0.42, 0, 0.1), 0.07, 0.35, m, rot=(0, 50, 0), verts=10)
    group(rot=(0, 0, -20))


def boots(i):
    m = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i] * 0.5)
    for x in (-0.38, 0.38):
        cyl((x, 0.05, 0.15), 0.25, 0.8, m, verts=18)
        box((x, -0.22, -0.32), (0.42, 0.75, 0.25), m, bevel=0.08)
        torus((x, 0.05, 0.52), 0.26, 0.05, mat('#5a3d22'), outline=False)
    group(rot=(0, 0, -30))


# Ore looks (rock colour, nugget colour, nugget glow): shared by the ore icons and kite shields.
ORE_STYLE = [('#6f6a66', '#d9823a', 0), ('#6f6a66', '#9a6a5a', 0), ('#5f5a58', '#eef2f6', 0), ('#4f5a5a', '#3fd0c0', 1.2), ('#2a2438', '#9b6cff', 1.8), ('#1f1a24', '#ff5a3a', 1.4), ('#5a4a3a', '#ffc84a', 1.2), ('#14141f', '#7a5aff', 2.2)]


def kite(i):
    """Kite shield in the style of its ore: metal rim, ore-rock face studded with that ore's nuggets."""
    rock, nug, emit = ORE_STYLE[i]
    rim = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i] * 0.5)
    outline = [(0, 0.95), (0.65, 0.6), (0.6, -0.1), (0, -1.1), (-0.6, -0.1), (-0.65, 0.6)]
    prism(outline, 0.12, rim)
    prism([(x * 0.82, z * 0.82 + 0.01) for x, z in outline], 0.05, mat(rock, rough=0.95), loc=(0, -0.07, 0))
    nm = mat(nug, rough=0.25, metal=0.9 if i != 1 else 0.3, emit=emit)
    for x, z, r in ((0, 0.62, 0.09), (0.36, 0.42, 0.08), (-0.36, 0.42, 0.08), (0.36, -0.12, 0.08), (-0.36, -0.12, 0.08), (0, -0.62, 0.09), (0.18, 0.08, 0.06), (-0.2, -0.32, 0.06)):
        ico((x, -0.11, z), r, nm, sub=1)
    ico((0, -0.14, 0.15), 0.2, nm, sub=1, scale=(1, 0.6, 1.15))  # a big nugget for the boss
    if i == 4:
        for _ in range(4):
            sphere((R.uniform(-0.4, 0.4), -0.16, R.uniform(-0.5, 0.6)), 0.04, glow('#fff1a8', 8), outline=False)
    group(rot=(0, 0, -25))


def platelegs(i):
    m = mat(METAL[i], rough=0.25, metal=0.9, emit=METAL_EMIT[i] * 0.5)
    box((0, 0, 0.55), (0.95, 0.5, 0.3), m, bevel=0.08)
    for x in (-0.25, 0.25):
        cyl((x, 0, -0.15), 0.22, 1.2, m, r2=0.17, verts=18)
        sphere((x, -0.08, -0.05), 0.15, m, scale=(1, 0.8, 0.8))
    box((0, -0.26, 0.55), (0.95, 0.03, 0.08), mat('#5a3d22'), outline=False)


# ---------------- late-game tiers (70 / 80 / 90) ----------------
def glowfin_ray():
    sphere((0, 0, 0), 0.9, mat('#2a5a6a'), scale=(1.25, 1.05, 0.18), rot=(0, 0, 45))
    sphere((0, 0, -0.05), 0.85, mat('#cfe8e8'), scale=(1.2, 1.0, 0.12), rot=(0, 0, 45), outline=False)
    tube([(-0.85, 0.85, 0), (-1.1, 1.1, 0.05), (-1.3, 1.3, 0.1)], [0.06, 0.04, 0.01], mat('#2a5a6a'))
    for _ in range(9):
        a, r = R.uniform(0, 6.28), R.uniform(0.15, 0.7)
        sphere((r * math.cos(a), r * math.sin(a), 0.16), 0.06, glow('#7ffcff', 5), scale=(1, 1, 0.4), outline=False)
    for sx in (-1, 1):
        sphere((0.3 + sx * 0.12, -0.3 + sx * 0.12, 0.17), 0.06, mat('#1b1426', rough=0.2), outline=False)
    group(rot=(30, 0, 10))  # tilt the flat ray toward the camera so its back shows


def stormmarlin():
    fish_body('#2a5aa8', '#e2ecf6', '#1f4080', length=2.5, height=0.65)
    cyl((1.75, 0, 0.02), 0.07, 1.0, mat('#1f4080'), r2=0.0, rot=(0, 90, 0))                       # spear bill
    cyl((-0.1, 0, 0.7), 0.45, 0.9, mat('#3f7ad8'), r2=0.0, scale=(2.0, 0.08, 1), verts=3, rot=(0, -10, 0))  # sail
    for k in range(5):
        box((0.7 - k * 0.3, -0.26, 0.05), (0.04, 0.02, 0.35), glow('#7fd6ff', 1.5), outline=False)
    group(rot=(0, 0, -20))


def abyssal_angler():
    sphere((0, 0, 0), 0.7, mat('#2a2238'), scale=(1.2, 1, 0.95))
    sphere((0.55, -0.1, -0.2), 0.45, mat('#120d18'), scale=(0.6, 1.1, 0.5), outline=False)          # gaping mouth
    for k in range(6):
        cyl((0.72, -0.45 + k * 0.17, -0.05), 0.04, 0.16, mat('#f5efe0'), r2=0.0, rot=(180, 0, 0))
    cyl((-0.85, 0, 0), 0.35, 0.5, mat('#3a2f50'), r2=0.0, rot=(0, 90, 0), scale=(1, 0.15, 1), verts=3)
    tube([(0.2, 0, 0.6), (0.6, 0, 1.15), (1.0, 0, 1.1), (1.15, 0, 0.85)], [0.04, 0.03, 0.025, 0.02], mat('#3a2f50'))
    sphere((1.15, 0, 0.8), 0.13, glow('#7fffd4', 7), outline=False)
    sphere((0.45, -0.45, 0.25), 0.08, glow('#d1ff3a', 4), outline=False)
    group(rot=(0, 0, -25))


def embervine():
    pts = [(0.5 * math.cos(t * 1.4), 0.5 * math.sin(t * 1.4), -0.8 + t * 0.32) for t in range(7)]
    tube(pts, [0.1] * 6 + [0.03], mat('#5a2a1f'))
    for x, y, z in pts[1:6]:
        sphere((x * 1.35, y * 1.35, z), 0.26, mat('#a8322a'), scale=(1.5, 0.35, 0.75), rot=(0, 0, math.degrees(math.atan2(y, x))))
        for dx in (-0.08, 0.08):
            sphere((x * 0.8 + dx, y * 0.8 - 0.12, z + 0.1), 0.12, glow('#ff7a2a', 6), outline=False)


def frostlotus():
    cyl((0, 0, -0.55), 0.95, 0.06, mat('#4f8a8a'), verts=32)
    for layer, (r, z, k, c) in enumerate(((0.45, -0.3, 8, '#e8f4ff'), (0.28, -0.15, 6, '#bfe6ff'))):
        for n in range(k):
            a = n * 360 / k + layer * 20
            sphere((r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), z), 0.24, mat(c, emit=0.3), scale=(1.3, 0.5, 0.45), rot=(0, -35, a))
    sphere((0, 0, -0.08), 0.14, glow('#9fe8ff', 6), outline=False)


def voidbloom():
    tube([(0, 0, -0.95), (0.1, 0, -0.3), (0, 0, 0.2)], [0.045, 0.04, 0.03], mat('#1f1a2a'))
    for n in range(6):
        a = n * 60
        sphere((0.3 * math.cos(math.radians(a)), 0.3 * math.sin(math.radians(a)), 0.4), 0.28, mat('#3a1f5a'), scale=(1.2, 0.35, 0.8), rot=(0, -40, a))
    sphere((0, 0, 0.42), 0.13, glow('#b48cff', 7), outline=False)
    for _ in range(6):
        sphere((R.uniform(-0.6, 0.6), R.uniform(-0.6, 0), R.uniform(0.4, 1.0)), 0.035, glow('#d8c8ff', 8), outline=False)


def seared_glowfin():
    plate_dish()
    sphere((0, 0, -0.2), 0.6, mat('#a8603a', rough=0.45), scale=(1.4, 1.0, 0.2), rot=(0, 0, 45))
    for k in range(4):
        box((-0.4 + k * 0.27, 0, -0.08), (0.05, 0.9, 0.02), mat('#3a1a10'), rot=(0, 0, 45), outline=False)
    for _ in range(5):
        sphere((R.uniform(-0.4, 0.4), R.uniform(-0.4, 0.4), -0.06), 0.04, glow('#7ffcff', 2), outline=False)
    sphere((0.6, -0.4, -0.22), 0.14, mat('#4fa64a'), scale=(1.4, 0.6, 0.4))


def marlin_steak():
    plate_dish()
    box((0, 0, -0.12), (1.0, 0.75, 0.38), mat('#d8846a', rough=0.5), bevel=0.15)
    box((0, 0, 0.07), (0.9, 0.65, 0.02), mat('#f2a88a'), outline=False)
    for k in range(4):
        box((-0.33 + k * 0.22, 0, 0.09), (0.05, 0.75, 0.02), mat('#5a2410'), rot=(0, 0, 30), outline=False)
    cyl((0.62, -0.42, -0.24), 0.18, 0.05, mat('#ffe66b'), verts=16)
    sphere((-0.6, -0.4, -0.25), 0.16, mat('#4dc8ff', rough=0.2), scale=(1.2, 1, 0.35), outline=False)


def angler_banquet():
    cyl((0, 0, -0.35), 1.05, 0.08, mat('#d9b46b', rough=0.3, metal=0.6), verts=40, scale=(1.35, 0.9, 1))
    sphere((0, 0, -0.05), 0.45, mat('#8a4a2a', rough=0.35), scale=(1.2, 1, 0.7))
    tube([(0.1, 0, 0.25), (0.35, 0, 0.55), (0.55, 0, 0.45)], [0.025, 0.02, 0.015], mat('#5a3020'))
    sphere((0.55, 0, 0.4), 0.08, glow('#7fffd4', 5), outline=False)
    sphere((-0.85, 0.15, -0.15), 0.25, mat('#d9a35a'), scale=(1.5, 0.9, 0.7))
    for _ in range(7):
        sphere((R.uniform(-1.1, 1.1), R.uniform(-0.6, 0.6), -0.22), 0.09, mat(R.choice(('#4fa64a', '#e8434a', '#ffe66b', '#ff8a3a'))), outline=False)


# ---------------- remains (Grace) ----------------
def bone(length=1.5, r=0.11, knob=0.17, c='#efe6d2', cracks=False):
    m = mat(c, rough=0.7)
    cyl((0, 0, 0), r, length, m, rot=(0, 90, 0), verts=16)
    for x in (-length / 2, length / 2):
        for y in (-knob * 0.55, knob * 0.55):
            sphere((x, y, 0), knob, m, seg=16, rings=10)
    if cracks:
        for x in (-0.25, 0.2):
            box((x, -r * 0.95, 0.02), (0.02, 0.01, r * 1.2), mat('#8a7a5a'), rot=(0, 25, 0), outline=False)
    group(rot=(0, 0, 30))


def bones():
    bone()


def bigbones():
    bone(length=1.7, r=0.19, knob=0.28, c='#e2d4b4', cracks=True)


def demonic_ash():
    cyl((0, 0, -0.3), 0.95, 0.5, mat('#3a3438', rough=1), r2=0.2, verts=24)
    for _ in range(14):
        sphere((R.uniform(-0.55, 0.55), R.uniform(-0.55, 0.1), R.uniform(-0.2, 0.0)), 0.05, glow(R.choice(('#c84aff', '#ff4a6a')), 6), outline=False)
    for k in range(3):
        sphere((0.1 * k - 0.1, 0.05, 0.25 + k * 0.28), 0.17 + k * 0.05, mat('#6a5a7a', emit=0.3, alpha=0.45), outline=False)


# ---------------- bone gear (Bonecraft) ----------------
BONE_C, BONE_D, LEATHER = '#efe6d2', '#d2c29e', '#5a3d22'


def bmat(c=BONE_C):
    return mat(c, rough=0.7)


def knuckle(loc, r, c=BONE_C, scale=(1, 1, 1)):
    sphere(loc, r, bmat(c), seg=16, rings=10, scale=scale)


def skull(loc=(0, 0, 0), s=1.0, eyes='#1b1426', glow_eyes=None):
    """A small skull: cranium, jaw, two eye sockets and a nose hole."""
    x, y, z = loc
    sphere((x, y, z + 0.05 * s), 0.32 * s, bmat(), scale=(1, 1, 0.95))
    box((x, y - 0.06 * s, z - 0.22 * s), (0.36 * s, 0.34 * s, 0.16 * s), bmat(), bevel=0.04 * s)
    em = glow(glow_eyes, 5) if glow_eyes else mat(eyes)
    for sx in (-1, 1):
        sphere((x + sx * 0.12 * s, y - 0.26 * s, z), 0.085 * s, em, outline=False)
    cyl((x, y - 0.29 * s, z - 0.11 * s), 0.035 * s, 0.05 * s, mat(eyes), rot=(90, 0, 0), verts=3, outline=False)
    for k in range(4):
        box((x - 0.12 * s + k * 0.08 * s, y - 0.23 * s, z - 0.25 * s), (0.05 * s, 0.02 * s, 0.07 * s), mat('#fffaf0'), outline=False)


def bone_dagger():
    # a sharpened shard of big bone on a leather-wrapped knuckle grip
    cyl((0, 0, 0.35), 0.14, 0.9, bmat(), r2=0.0, verts=6, scale=(1, 0.35, 1))
    for k in range(3):
        box((0.05, -0.05, 0.12 + k * 0.22), (0.12, 0.01, 0.02), mat('#a8987a'), rot=(0, 30, 0), outline=False)
    box((0, 0, -0.12), (0.4, 0.14, 0.1), bmat(BONE_D), bevel=0.03)
    cyl((0, 0, -0.35), 0.07, 0.38, mat(LEATHER))
    knuckle((0.0, 0.04, -0.58), 0.1)
    knuckle((0.0, -0.04, -0.58), 0.1)
    group(rot=(0, 45, 0))


def bone_sword():
    # a jawbone-edged blade: long bone core with teeth along one edge
    cyl((0, 0, 0.55), 0.13, 1.6, bmat(), r2=0.05, verts=8, scale=(1, 0.4, 1))
    for k in range(7):
        cyl((0.13, 0, -0.05 + k * 0.2), 0.045, 0.13, mat('#fffaf0'), r2=0.0, rot=(0, 90, 0), verts=6)
    for sx in (-1, 1):
        knuckle((sx * 0.3, 0, -0.3), 0.13, BONE_D)
    box((0, 0, -0.3), (0.5, 0.14, 0.1), bmat(BONE_D), bevel=0.03)
    cyl((0, 0, -0.58), 0.07, 0.5, mat(LEATHER))
    for k in range(4):
        torus((0, 0, -0.4 - k * 0.12), 0.075, 0.015, mat('#3a2614'), outline=False)
    skull((0, 0, -0.95), 0.4)
    group(rot=(0, 45, 0))


def bone_bow():
    # two curved rib bones joined at a vertebra grip
    pts = [(0.15, 0, 1.2), (0.48, 0, 0.75), (0.6, 0, 0.18)]
    tube(pts, [0.04, 0.08, 0.09], bmat())
    tube([(0.6, 0, -0.18), (0.48, 0, -0.75), (0.15, 0, -1.2)], [0.09, 0.08, 0.04], bmat())
    for z in (1.2, -1.2):
        knuckle((0.15, 0, z), 0.08, BONE_D)
    for k in range(3):
        cyl((0.62, 0, -0.2 + k * 0.2), 0.13, 0.12, bmat(BONE_D), verts=12)
    tube([(0.15, 0, 1.2), (0.15, 0, -1.2)], [0.012, 0.012], mat('#c8b890'), outline=False)
    group(rot=(0, -30, 0))


def bone_staff():
    # a long leg bone with a skull on top and glowing eyes
    cyl((0, 0, -0.2), 0.07, 2.2, bmat(), verts=12)
    for sx in (-1, 1):
        knuckle((sx * 0.05, 0, -1.3), 0.11)
    torus((0, 0, -0.15), 0.08, 0.03, mat(LEATHER), outline=False)
    torus((0, 0, 0.0), 0.08, 0.03, mat(LEATHER), outline=False)
    skull((0, 0, 1.15), 1.15, glow_eyes='#7dff9a')
    group(rot=(0, 35, 0))


def bone_helm():
    # a big-creature skull worn as a helm, with two horns
    sphere((0, 0, 0.1), 0.7, bmat(), scale=(1, 1, 1.0))
    box((0, -0.6, -0.08), (0.6, 0.2, 0.32), mat('#120d18'), outline=False)
    for sx in (-1, 1):
        sphere((sx * 0.2, -0.6, 0.22), 0.13, mat('#120d18'), outline=False)
        tube([(sx * 0.55, 0, 0.35), (sx * 0.95, -0.1, 0.65), (sx * 1.0, -0.25, 1.05)], [0.13, 0.08, 0.02], bmat(BONE_D))
    for k in range(5):
        cyl((-0.24 + k * 0.12, -0.66, -0.3), 0.04, 0.16, mat('#fffaf0'), r2=0.0, rot=(180, 0, 0), verts=6)
    cyl((0, 0, -0.5), 0.72, 0.16, bmat(BONE_D), verts=28)


def bone_gauntlets():
    cyl((0, 0, -0.55), 0.38, 0.55, mat(LEATHER), r2=0.32, verts=20)
    for k in range(4):
        torus((0, 0, -0.75 + k * 0.14), 0.38 - k * 0.015, 0.035, bmat(), outline=False)  # bone bands on the cuff
    box((0, 0, 0.05), (0.62, 0.32, 0.6), mat(LEATHER), bevel=0.08)
    for k in range(4):
        x = -0.22 + k * 0.15
        cyl((x, 0, 0.5), 0.055, 0.35, bmat(), verts=10)
        knuckle((x, -0.02, 0.32), 0.08)
        knuckle((x, 0, 0.7), 0.065)
    cyl((0.42, 0, 0.1), 0.06, 0.35, bmat(), rot=(0, 50, 0), verts=10)
    group(rot=(0, 0, -20))


def bone_boots():
    for x in (-0.38, 0.38):
        cyl((x, 0.05, 0.15), 0.25, 0.8, mat(LEATHER), verts=18)
        box((x, -0.22, -0.32), (0.42, 0.75, 0.25), bmat(BONE_D), bevel=0.08)
        for k in range(3):
            tube([(x - 0.27, 0.05, -0.05 + k * 0.22), (x, -0.25, -0.05 + k * 0.22), (x + 0.27, 0.05, -0.05 + k * 0.22)], [0.04, 0.05, 0.04], bmat())
        for t in (-0.12, 0, 0.12):
            knuckle((x + t, -0.6, -0.36), 0.06)
    group(rot=(0, 0, -30))


def bone_shield():
    # round leather shield with a big skull boss and a rim of crossed bones
    cyl((0, 0, 0), 0.9, 0.12, mat('#7a5a3a', rough=0.9), rot=(90, 0, 0), verts=36)
    for a in range(10):
        t = a * math.tau / 10
        x, z = 0.82 * math.cos(t), 0.82 * math.sin(t)
        cyl((x, -0.07, z), 0.06, 0.42, bmat(), rot=(0, -math.degrees(t), 0), verts=10)
        knuckle((x, -0.08, z), 0.08, BONE_D)
    skull((0, -0.2, 0.05), 1.0)
    group(rot=(0, 0, -25))


def bone_legs():
    box((0, 0, 0.55), (0.95, 0.5, 0.3), mat(LEATHER), bevel=0.08)
    sphere((0, -0.05, 0.45), 0.42, bmat(), scale=(1.15, 0.6, 0.45))   # hip bone plate
    for x in (-0.25, 0.25):
        cyl((x, 0, -0.15), 0.22, 1.2, mat(LEATHER), r2=0.17, verts=18)
        cyl((x, -0.15, -0.2), 0.07, 1.0, bmat(), verts=10)              # shin bone
        knuckle((x - 0.04, -0.17, 0.32), 0.1)
        knuckle((x + 0.04, -0.17, 0.32), 0.1)
        sphere((x, -0.12, -0.05), 0.15, bmat(BONE_D), scale=(1, 0.8, 0.8))  # kneecap


def bone_chest():
    # a ribcage breastplate: spine down the middle, ribs curving round a leather vest
    cyl((0, 0, 0), 0.62, 1.15, mat(LEATHER), r2=0.5, verts=24, scale=(1, 0.62, 1))
    for s_ in (-1, 1):
        sphere((s_ * 0.62, 0, 0.42), 0.3, bmat(BONE_D), scale=(1, 0.9, 0.6))   # shoulder blades
    for k in range(4):
        z = 0.32 - k * 0.22
        w = 0.6 - k * 0.04
        for s_ in (-1, 1):
            tube([(0, -0.42, z), (s_ * w * 0.6, -0.38, z + 0.02), (s_ * w, -0.12, z - 0.06)], [0.045, 0.05, 0.03], bmat())
    for k in range(6):
        knuckle((0, -0.43, 0.42 - k * 0.17), 0.065, BONE_D, scale=(1, 0.8, 0.8))
    cyl((0, 0, 0.58), 0.25, 0.05, mat('#1b1426'), scale=(1, 0.7, 1), outline=False)
    torus((0, 0, -0.42), 0.6, 0.06, mat('#3a2614'), scale=(1, 0.64, 1))


# ---------------- glyphs, chipped stone, ranger armor, mage robes, spells ----------------
def mix(a, b, t):
    a, b = a.lstrip('#'), b.lstrip('#')
    ca = [int(a[i:i + 2], 16) for i in (0, 2, 4)]
    cb = [int(b[i:i + 2], 16) for i in (0, 2, 4)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(ca, cb))


def seg(points, r, m, outline=False):
    """Straight strokes between points (sharp corners), with round joints."""
    for a, b in zip(points, points[1:]):
        tube([a, b], [r, r], m, outline=outline)
    for p_ in points:
        sphere(p_, r, m, seg=10, rings=6, outline=False)


GLYPH_COL = {'spark': '#ffe14a', 'tide': '#4fb3ff', 'root': '#5fd068', 'gale': '#cfeeff',
             'ember': '#ff7a2a', 'frost': '#9ff0ff', 'radiant': '#ffe9a0', 'void': '#a06bff'}
GLYPH_KEYS = list(GLYPH_COL)
STONE = '#7f8aa6'


def glyph_symbol(k, y, s=1.0, m=None, r=0.055):
    """Draws glyph `k` as glowing strokes in the XZ plane at depth y (the face of a tablet or robe)."""
    m = m or glow(GLYPH_COL[k], 4)
    P = lambda x, z: (x * s, y, z * s)
    if k == 'spark':     # lightning zigzag
        seg([P(0.18, 0.55), P(-0.12, 0.08), P(0.14, 0.02), P(-0.2, -0.55)], r * s, m)
    elif k == 'tide':    # two waves
        for z in (0.18, -0.18):
            seg([P(-0.5 + i * 0.125, z + 0.1 * math.sin(i * math.pi / 2)) for i in range(9)], r * s, m)
    elif k == 'root':    # a stem splitting into roots
        seg([P(0, 0.55), P(0, -0.05)], r * s, m)
        for dx in (-0.35, 0, 0.35):
            seg([P(0, -0.05), P(dx * 0.6, -0.3), P(dx, -0.55)], r * s * 0.85, m)
        seg([P(0, 0.3), P(-0.2, 0.45)], r * s * 0.8, m)
    elif k == 'gale':    # spiral
        pts = [P(math.cos(a) * (0.08 + a * 0.06), math.sin(a) * (0.08 + a * 0.06)) for a in [i * 0.45 for i in range(20)]]
        seg(pts, r * s * 0.9, m)
    elif k == 'ember':   # flame
        seg([P(0, 0.6), P(0.3, 0.1), P(0.28, -0.25), P(0, -0.45), P(-0.28, -0.25), P(-0.3, 0.1), P(-0.1, 0.25), P(0, 0.6)], r * s, m)
        seg([P(0, 0.15), P(0.12, -0.15), P(0, -0.3), P(-0.12, -0.15), P(0, 0.15)], r * s * 0.8, m)
    elif k == 'frost':   # snowflake
        for a in (0, 60, 120):
            t = math.radians(a)
            c, sn = math.cos(t), math.sin(t)
            seg([P(-0.55 * c, -0.55 * sn), P(0.55 * c, 0.55 * sn)], r * s, m)
            for e in (-1, 1):
                bx, bz = e * 0.38 * c, e * 0.38 * sn
                for w in (-1, 1):
                    t2 = t + w * math.radians(45)
                    seg([P(bx, bz), P(bx - e * 0.15 * math.cos(t2), bz - e * 0.15 * math.sin(t2))], r * s * 0.7, m)
    elif k == 'radiant':  # sun: ring and rays
        torus(P(0, 0), 0.2 * s, r * s, m, rot=(90, 0, 0), outline=False)
        for i in range(8):
            t = i * math.pi / 4
            seg([P(0.32 * math.cos(t), 0.32 * math.sin(t)), P(0.55 * math.cos(t), 0.55 * math.sin(t))], r * s * 0.85, m)
    elif k == 'void':    # an eye: ring, pupil and lids
        torus(P(0, 0), 0.22 * s, r * s, m, rot=(90, 0, 0), outline=False)
        sphere(P(0, 0), 0.09 * s, m, outline=False)
        for e in (-1, 1):
            seg([P(-0.58, 0), P(-0.3, e * 0.28), P(0.3, e * 0.28), P(0.58, 0)], r * s * 0.8, m)


def chipped_stone():
    m = mat(STONE, rough=0.95)
    ico((0, 0, 0), 0.62, m, sub=1, scale=(1.1, 0.8, 0.75), rot=(10, 20, 5))
    ico((0.55, -0.1, -0.25), 0.3, m, sub=1, rot=(30, 10, 40))
    ico((-0.5, -0.2, -0.3), 0.22, m, sub=1, rot=(5, 50, 20))
    # faint blue veins of magic in the stone
    for pts in (((-0.35, -0.42, 0.2), (-0.05, -0.5, 0.05), (0.25, -0.46, 0.2)), ((-0.1, -0.48, -0.15), (0.2, -0.45, -0.25))):
        seg(list(pts), 0.03, glow('#8fb8ff', 3))
    group(rot=(0, 0, 15))


def enchanted_stone():
    """The Enchanted Stone you mine: a big rune-scored boulder with blue crystals."""
    m = mat('#5a6688', rough=0.95)
    ico((0, 0, -0.1), 1.0, m, sub=2, scale=(1.15, 0.9, 0.75))
    ico((0.8, 0.2, -0.45), 0.45, m, sub=1)
    ico((-0.85, 0.1, -0.5), 0.38, m, sub=1)
    cm = mat('#8fb8ff', rough=0.1, emit=1.6)
    for x, z, h, t in ((0.15, 0.85, 0.9, 10), (-0.25, 0.75, 0.65, -25), (0.5, 0.7, 0.55, 35), (-0.55, 0.5, 0.4, -45)):
        cyl((x, -0.1, z), 0.16, h, cm, r2=0.0, verts=5, rot=(0, t, 0))
        cyl((x - math.sin(math.radians(t)) * h * 0.45, -0.1, z - h * 0.45), 0.16, 0.12, cm, verts=5, rot=(0, t, 0))
    glyph_symbol('frost', -0.93, s=0.5, m=glow('#8fb8ff', 3), r=0.05)
    group(rot=(0, 0, 15))


def glyph_tablet(k):
    rim = mat(STONE, rough=0.9)
    cyl((0, 0, 0), 0.85, 0.22, rim, rot=(90, 0, 0), verts=7)
    cyl((0, -0.06, 0), 0.72, 0.14, mat(mix(STONE, '#2a2a3a', 0.35), rough=0.9), rot=(90, 0, 0), verts=7, outline=False)
    glyph_symbol(k, -0.14)
    group(rot=(-35, 0, 18))


# Ranger armor: leather with wood-toned trim and green cloth
LEATHER_C, CLOTH_G = '#7a5236', '#4a6a3a'


def r_hood(i):
    sphere((0, 0, 0.1), 0.66, mat(mix(CLOTH_G, WOOD[i], 0.25), rough=0.9), scale=(1, 1, 1.1))
    sphere((0, -0.42, 0.0), 0.42, mat('#120d18'), scale=(0.95, 0.6, 1.0), outline=False)
    for x in (-0.14, 0.14):
        sphere((x, -0.66, 0.05), 0.045, glow('#fff1a8', 3), outline=False)   # eyes glinting in the shadow
    cyl((0, 0.15, -0.55), 0.75, 0.35, mat(mix(CLOTH_G, WOOD[i], 0.25), rough=0.9), r2=0.55, verts=20)   # cape drape
    cyl((0, 0.1, 0.62), 0.12, 0.45, mat(mix(CLOTH_G, WOOD[i], 0.25), rough=0.9), r2=0.0, rot=(-35, 0, 0), verts=12)  # hood point
    torus((0, -0.05, -0.38), 0.55, 0.05, mat(WOOD[i], rough=0.5), scale=(1, 0.8, 1))
    if i >= 3:
        sphere((0, -0.6, -0.38), 0.09, glow(GEM[i], 4), outline=False)


def r_gloves(i):
    lm = mat(LEATHER_C, rough=0.8)
    for x in (-0.42, 0.42):
        cyl((x, 0, -0.1), 0.3, 0.95, lm, r2=0.24, verts=18)
        for k in range(3):
            torus((x, 0, -0.4 + k * 0.28), 0.29 - k * 0.02, 0.035, mat(WOOD[i], rough=0.5), outline=False)
        box((x, -0.27, 0.05), (0.06, 0.04, 0.6), mat('#3a2614'), outline=False)
    group(rot=(0, 0, -25))


def r_boots(i):
    lm = mat(LEATHER_C, rough=0.8)
    for x in (-0.38, 0.38):
        cyl((x, 0.05, 0.15), 0.25, 0.8, lm, verts=18)
        box((x, -0.22, -0.32), (0.42, 0.75, 0.25), lm, bevel=0.1)
        cyl((x, 0.05, 0.58), 0.3, 0.12, mat(WOOD[i], rough=0.5), verts=18)   # cuff
        for k in range(3):
            box((x, -0.22, 0.0 + k * 0.18), (0.3, 0.02, 0.03), mat('#3a2614'), outline=False)
    group(rot=(0, 0, -30))


def r_legs(i):
    lm = mat(LEATHER_C, rough=0.8)
    box((0, 0, 0.55), (0.95, 0.5, 0.3), lm, bevel=0.08)
    box((0, -0.27, 0.55), (0.95, 0.04, 0.1), mat(WOOD[i], rough=0.5), outline=False)
    for x in (-0.25, 0.25):
        cyl((x, 0, -0.15), 0.22, 1.2, lm, r2=0.17, verts=18)
        box((x, -0.2, -0.05), (0.2, 0.06, 0.5), mat(mix(CLOTH_G, WOOD[i], 0.25), rough=0.9), bevel=0.03)   # knee pads
    sphere((0.38, -0.12, 0.42), 0.12, mat('#3a2614'), scale=(1, 0.6, 1.2))  # belt pouch


def r_body(i):
    lm = mat(LEATHER_C, rough=0.8)
    cyl((0, 0, 0), 0.62, 1.15, lm, r2=0.5, verts=24, scale=(1, 0.62, 1))
    for s_ in (-1, 1):
        sphere((s_ * 0.62, 0, 0.42), 0.3, mat(mix(CLOTH_G, WOOD[i], 0.25), rough=0.9), scale=(1, 0.9, 0.6))
    cyl((0, 0, 0.58), 0.25, 0.05, mat('#1b1426'), scale=(1, 0.7, 1), outline=False)
    # a quiver strap across the chest with buckles in the tier's wood colour
    box((0, -0.39, 0.05), (0.14, 0.04, 1.3), mat('#3a2614'), rot=(0, 40, 0), outline=False)
    for z in (-0.25, 0.2):
        box((z * -0.8, -0.42, z), (0.14, 0.03, 0.1), mat(WOOD[i], rough=0.4, metal=0.3), rot=(0, 40, 0), outline=False)
    torus((0, 0, -0.42), 0.6, 0.06, mat(WOOD[i], rough=0.5), scale=(1, 0.64, 1))
    if i >= 3:
        sphere((0, -0.42, -0.42), 0.08, glow(GEM[i], 4), outline=False)


# Mage robes: cloth tinted by the tier's glyph, gold trim, a glowing glyph
def robe_cols(i):
    k = GLYPH_KEYS[i]
    return k, mat(mix(GLYPH_COL[k], '#1d1838', 0.55), rough=0.85), mat('#e8c25a', rough=0.35, metal=0.6)


def m_hood(i):
    k, cloth, trim = robe_cols(i)
    cyl((0, 0, -0.45), 0.95, 0.1, cloth, verts=32, scale=(1, 0.9, 1))          # brim
    tube([(0, 0, -0.4), (0, 0, 0.3), (0.15, 0.05, 0.8), (0.45, 0.1, 1.0)], [0.55, 0.38, 0.16, 0.04], cloth)  # bent cone
    torus((0, 0, -0.32), 0.53, 0.06, trim)
    glyph_symbol(k, -0.47, s=0.3, r=0.06)
    for _ in range(3):
        sphere((R.uniform(-0.3, 0.3), -0.42, R.uniform(0.1, 0.4)), 0.035, glow('#fff6c0', 5), outline=False)


def m_gloves(i):
    k, cloth, trim = robe_cols(i)
    for x in (-0.42, 0.42):
        cyl((x, 0, -0.15), 0.28, 0.75, cloth, r2=0.32, verts=18)
        box((x, 0, 0.35), (0.42, 0.24, 0.42), cloth, bevel=0.08)
        torus((x, 0, -0.5), 0.29, 0.045, trim)
    for x in (-0.42, 0.42):
        sphere((x, -0.15, 0.35), 0.1, glow(GLYPH_COL[k], 4), outline=False)
    group(rot=(0, 0, -25))


def m_boots(i):
    k, cloth, trim = robe_cols(i)
    for x in (-0.38, 0.38):
        cyl((x, 0.05, 0.12), 0.24, 0.7, cloth, verts=18)
        box((x, -0.2, -0.32), (0.4, 0.65, 0.22), cloth, bevel=0.1)
        tube([(x, -0.5, -0.32), (x, -0.68, -0.2), (x, -0.6, -0.02)], [0.12, 0.07, 0.03], cloth)   # curled toe
        torus((x, 0.05, 0.47), 0.25, 0.045, trim)
        sphere((x, -0.6, -0.02), 0.05, glow(GLYPH_COL[k], 4), outline=False)
    group(rot=(0, 0, -30))


def m_legs(i):
    k, cloth, trim = robe_cols(i)
    cyl((0, 0, -0.1), 0.42, 1.35, cloth, r2=0.62, verts=28, rot=(180, 0, 0), scale=(1, 0.7, 1))   # flared skirt
    torus((0, 0, 0.56), 0.43, 0.06, trim, scale=(1, 0.7, 1))
    torus((0, 0, -0.76), 0.62, 0.05, trim, scale=(1, 0.7, 1))
    glyph_symbol(k, -0.47, s=0.35)


def m_body(i):
    k, cloth, trim = robe_cols(i)
    cyl((0, 0, 0), 0.6, 1.2, cloth, r2=0.48, verts=24, scale=(1, 0.62, 1))
    for s_ in (-1, 1):
        sphere((s_ * 0.6, 0, 0.42), 0.3, cloth, scale=(1, 0.9, 0.6))
        box((s_ * 0.16, -0.38, 0.1), (0.08, 0.04, 1.0), trim, rot=(0, s_ * -12, 0), outline=False)   # trim down the front
    torus((0, 0, 0.6), 0.28, 0.07, trim, scale=(1, 0.75, 1))   # collar
    torus((0, 0, -0.25), 0.55, 0.06, trim, scale=(1, 0.66, 1))  # sash
    glyph_symbol(k, -0.4, s=0.3)


SPELL_COL = {'sparkbolt': '#ffe14a', 'tidebolt': '#4fb3ff', 'rootlash': '#5fd068', 'galestrike': '#cfeeff', 'emberblast': '#ff7a2a',
             'frostlance': '#9ff0ff', 'thornstorm': '#7fe07a', 'sunflare': '#ffd84a', 'voidrend': '#a06bff', 'cataclysm': '#ff4a8a'}


def spell_art(sid):
    c = SPELL_COL[sid]
    g = glow(c, 5)
    if sid == 'sparkbolt':
        prism([(0.25, 1.0), (-0.3, 0.05), (0.02, 0.05), (-0.25, -1.0), (0.35, 0.15), (0.03, 0.15)], 0.18, g)
        for _ in range(6):
            sphere((R.uniform(-0.7, 0.7), R.uniform(-0.2, 0.2), R.uniform(-0.8, 0.8)), 0.05, glow('#ffffff', 6), outline=False)
    elif sid == 'tidebolt':
        sphere((0, 0, 0), 0.55, mat(c, rough=0.05, emit=1.2, alpha=0.85))
        for k in range(3):
            torus((0, 0, 0), 0.72 + k * 0.08, 0.05, glow(mix(c, '#ffffff', 0.4), 3), rot=(70 + k * 25, k * 40, 0), outline=False)
        tube([(0.5, 0.3, -0.2), (1.0, 0.4, -0.6), (1.4, 0.5, -0.7)], [0.35, 0.2, 0.02], mat(c, rough=0.1, emit=0.8, alpha=0.7), outline=False)
    elif sid == 'rootlash':
        for k in range(3):
            a = k * 2.1
            pts = [(0.2 * math.cos(a), 0.2 * math.sin(a), -1.0), (0.6 * math.cos(a + 0.7), 0.6 * math.sin(a + 0.7), -0.2),
                   (0.3 * math.cos(a + 1.6), 0.3 * math.sin(a + 1.6), 0.5), (0.7 * math.cos(a + 2.4), 0.5 * math.sin(a + 2.4), 1.0)]
            tube(pts, [0.12, 0.09, 0.06, 0.02], mat('#4a7a2a', rough=0.7))
            for p_ in pts[1:3]:
                cyl(p_, 0.06, 0.2, mat('#2a4a1a'), r2=0.0, rot=(R.uniform(0, 90), R.uniform(0, 90), 0), verts=6)
        sphere((0, 0, 0), 0.25, glow(c, 3), outline=False)
    elif sid == 'galestrike':
        for k in range(5):
            torus((0, 0, -0.6 + k * 0.3), 0.25 + k * 0.15, 0.04, mat(c, emit=1.5, alpha=0.75), rot=(0, 0, k * 30), outline=False)
        for _ in range(5):
            sphere((R.uniform(-0.8, 0.8), R.uniform(-0.3, 0.3), R.uniform(-0.6, 0.8)), 0.05, glow('#ffffff', 4), outline=False)
    elif sid == 'emberblast':
        sphere((0, 0, 0), 0.5, glow('#ffd84a', 4), outline=False)
        sphere((0, 0, 0), 0.62, mat(c, emit=2.5, alpha=0.6), outline=False)
        for k in range(8):
            a = k * math.pi / 4
            cyl((0.75 * math.cos(a), 0, 0.75 * math.sin(a)), 0.16, 0.5, glow(c, 4), r2=0.0, rot=(0, 90 - math.degrees(a), 0), verts=8, outline=False)
        glyph_symbol('spark', -0.7, s=0.35, r=0.06)
    elif sid == 'frostlance':
        cyl((0, 0, 0), 0.22, 2.4, mat(c, rough=0.05, emit=1.0, alpha=0.85), r2=0.0, verts=6, rot=(0, 45, 0))
        for _ in range(6):
            ico((R.uniform(-0.6, 0.2), R.uniform(-0.3, 0.3), R.uniform(-0.8, 0.0)), R.uniform(0.07, 0.14), mat(c, rough=0.05, emit=1.2), sub=1)
        glyph_symbol('frost', -0.6, s=0.4, r=0.045)
    elif sid == 'thornstorm':
        for k in range(14):
            a = k * 0.9
            rr = 0.25 + k * 0.05
            cyl((rr * math.cos(a), rr * math.sin(a) * 0.4, -0.7 + k * 0.1), 0.06, 0.28, mat('#3a6a2a', rough=0.7), r2=0.0, rot=(R.uniform(0, 180), R.uniform(0, 180), 0), verts=6)
        for k in range(3):
            torus((0, 0, -0.4 + k * 0.4), 0.45 + k * 0.15, 0.03, mat('#cfeeff', emit=1.5, alpha=0.7), rot=(0, 0, k * 40), outline=False)
        sphere((0, 0, 0), 0.18, glow(c, 4), outline=False)
    elif sid == 'sunflare':
        sphere((0, 0, 0), 0.55, glow('#fff1a8', 5), outline=False)
        for k in range(12):
            a = k * math.pi / 6
            cyl((0.85 * math.cos(a), 0, 0.85 * math.sin(a)), 0.12, 0.5, glow(c, 4), r2=0.0, rot=(0, 90 - math.degrees(a), 0), verts=8, outline=False)
        torus((0, 0, 0), 0.62, 0.05, glow('#ff9a2a', 4), rot=(90, 0, 0), outline=False)
    elif sid == 'voidrend':
        sphere((0, 0, 0), 0.5, mat('#08060f', rough=0.3))
        torus((0, 0, 0), 0.68, 0.08, glow(c, 5), rot=(75, 0, 20), outline=False)
        torus((0, 0, 0), 0.85, 0.03, glow('#ff6aff', 4), rot=(60, 30, 0), outline=False)
        for _ in range(8):
            sphere((R.uniform(-1, 1), R.uniform(-0.2, 0.2), R.uniform(-1, 1)), 0.04, glow(c, 6), outline=False)
    elif sid == 'cataclysm':
        ico((0.25, 0, 0.25), 0.5, mat('#3a2a2a', rough=0.95), sub=2)
        sphere((0.25, 0, 0.25), 0.58, mat('#ff6a2a', emit=2.0, alpha=0.45), outline=False)
        tube([(0.0, 0, 0.0), (-0.5, 0.05, -0.45), (-1.1, 0.1, -1.0)], [0.5, 0.3, 0.02], mat(c, emit=2.5, alpha=0.6), outline=False)
        tube([(0.1, 0.05, 0.1), (-0.4, 0.1, -0.5), (-0.9, 0.15, -1.1)], [0.3, 0.18, 0.02], glow('#a06bff', 4), outline=False)


ITEMS = {
    'bonedagger': bone_dagger, 'bonesword': bone_sword, 'bonebow': bone_bow, 'bonestaff': bone_staff,
    'bonehelm': bone_helm, 'bonegloves': bone_gauntlets, 'boneboots': bone_boots, 'boneshield': bone_shield,
    'bonelegs': bone_legs, 'bonechest': bone_chest,
    'chipped': chipped_stone, 'enchstone': enchanted_stone,
    'sand': sand, 'bones': bones, 'bigbones': bigbones, 'ash': demonic_ash, 'glass': molten_glass, 'vial': vial,
    'log0': lambda: log('#8a5a35', '#e8c99a', '#b8925a'),
    'log1': lambda: log('#efe9dc', '#f2e2c4', '#cdb08a', marks='#2a2420'),
    'log2': lambda: log('#7a2a1f', '#f2905a', '#c85a2a', glow_c='#ffb04a'),
    'log3': lambda: log('#a8b0ba', '#eef0f4', '#b8c0cc'),
    'log4': lambda: log('#3f2a3a', '#d8c8a8', '#8a6a5a', glow_c='#7dff9a'),
    'ore0': lambda: ore('#6f6a66', '#d9823a'),
    'ore1': lambda: ore('#6f6a66', '#9a6a5a', metallic=False),
    'ore2': lambda: ore('#5f5a58', '#eef2f6'),
    'ore3': lambda: ore('#4f5a5a', '#3fd0c0', emit=1.2),
    'ore4': lambda: ore('#2a2438', '#9b6cff', emit=1.8, sparkle='#fff1a8'),
    'fish0': minnow, 'fish1': trout, 'fish2': spinefin, 'fish3': shark, 'fish4': eel,
    'herb0': mintleaf, 'herb1': sunpetal, 'herb2': moonbloom, 'herb3': dragonroot, 'herb4': starmoss,
    'food0': grilled_minnow, 'food1': baked_trout, 'food2': stew, 'food3': steak, 'food4': eel_feast,
    'pot0': lambda: potion('#e8434a'),
    'pot1': lambda: potion('#8a96a8', emit=0.2),
    'pot2': lambda: potion('#5cc46a'),
    'pot3': lambda: potion('#4fc3ff', emit=1.0),
    'pot4': lambda: potion('#ffd84a', emit=2.0, glow_extra=True),
    'bread': bread, 'burnt': burnt,
    'log5': lambda: log('#4a4a52', '#b8b0a8', '#6a625a'),
    'log6': lambda: log('#7a1f1f', '#ff9a5a', '#c8402a', glow_c='#ff6a2a'),
    'log7': lambda: log('#e8e0c0', '#f4f8e8', '#a8c890', glow_c='#ffe86a', marks='#7ab060'),
    'ore5': lambda: ore('#1f1a24', '#ff5a3a', emit=1.4),
    'ore6': lambda: ore('#5a4a3a', '#ffc84a', emit=1.2),
    'ore7': lambda: ore('#14141f', '#7a5aff', emit=2.2, sparkle='#c8b8ff'),
    'fish5': glowfin_ray, 'fish6': stormmarlin, 'fish7': abyssal_angler,
    'herb5': embervine, 'herb6': frostlotus, 'herb7': voidbloom,
    'food5': seared_glowfin, 'food6': marlin_steak, 'food7': angler_banquet,
    'pot5': lambda: potion('#ff7a2a', emit=1.2),
    'pot6': lambda: potion('#8fb4ff', emit=0.8),
    'pot7': lambda: potion('#ff4a1a', emit=2.2, glow_extra=True),
}
for i in range(len(METAL)):
    ITEMS[f'bar{i}'] = (lambda i: lambda: bar(i))(i)
    ITEMS[f'sword{i}'] = (lambda i: lambda: blade(i))(i)
    ITEMS[f'armor{i}'] = (lambda i: lambda: plate(i))(i)
    for pre, fn in (('dagger', dagger), ('longsword', longsword), ('greatsword', greatsword), ('plank', plank), ('bow', bow), ('staff', staff), ('wshield', wshield), ('orb', orb),
                    ('helm', helm), ('gloves', gauntlet), ('boots', boots), ('kite', kite), ('legs', platelegs)):
        ITEMS[f'{pre}{i}'] = (lambda fn, i: lambda: fn(i))(fn, i)

for k in GLYPH_KEYS:
    ITEMS['glyph_' + k] = (lambda k: lambda: glyph_tablet(k))(k)
for i in range(len(METAL)):
    for suf, rfn, mfn in (('hood', r_hood, m_hood), ('gloves', r_gloves, m_gloves), ('boots', r_boots, m_boots), ('legs', r_legs, m_legs), ('body', r_body, m_body)):
        ITEMS[f'r{suf}{i}'] = (lambda fn, i: lambda: fn(i))(rfn, i)
        ITEMS[f'm{suf}{i}'] = (lambda fn, i: lambda: fn(i))(mfn, i)
# Spell pictures go to assets/spells/<id>.webp (python art/blender/items.py spell/sparkbolt)
for sid in SPELL_COL:
    ITEMS['spell/' + sid] = (lambda sid: lambda: spell_art(sid))(sid)


def build(item_id):
    R.seed(sum(map(ord, item_id)))
    reset(transparent=True, samples=32)
    world_color('#9a94b8', 0.8)
    ITEMS[item_id]()
    add_outlines(0.03)
    sun((48, 0, -35), 3.0, '#fff4e0')
    sun((65, 0, 110), 1.0, '#c9d8ff')
    sun((-120, 0, 15), 1.6, '#ffe6c0')
    cam = camera((3.0, -6.0, 4.5), (0, 0, 0), ortho=3)
    # Melee weapons fill less or more of the frame by size, so a dagger reads small and a 2H sword huge.
    margin = {'dagger': 1.9, 'sword': 1.5, 'longsword': 1.28, 'greatsword': 1.08, 'bonedagger': 1.8, 'bonesword': 1.4}.get(item_id.rstrip('01234567'), 1.12)
    frame_ortho(cam, margin)
    out = os.path.join(ROOT, 'assets', 'spells', item_id[6:] + '.webp') if item_id.startswith('spell/') else os.path.join(OUT, item_id + '.webp')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    render(out, 128, 128, quality=88)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n in [a for a in sys.argv[1:] if not a.startswith('-')] or list(ITEMS):
        build(n)
        print('rendered', n, flush=True)
