"""Builds and renders every hero, monster and boss sprite to assets/sprites/*.webp.

    python art/blender/sprites.py            # all sprites
    python art/blender/sprites.py nyx wolf   # only these
"""
import os
import sys
import math
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

OUT = os.path.join(ROOT, 'assets', 'sprites')
DARK = '#2b2030'
WOOD = '#8a5a35'
STEEL = '#b9c3cf'
GOLD = '#f2c14e'
BOOT = '#3b2a22'
P = 0.56  # weapon-hand x (the hand nearer the camera)


def steel():
    return mat(STEEL, rough=0.3, metal=0.8)


def gold():
    return mat(GOLD, rough=0.3, metal=0.9)


def glow(c, s=4):
    return mat(c, emit=s)


# ---------------- heads ----------------
def eyes(z=1.6, y=-0.44, color='#1b1426', spread=0.17, size=0.075, shine=True):
    for s in (-1, 1):
        sphere((s * spread, y, z), size, mat(color, rough=0.2), scale=(1, 0.5, 1.35), outline=False)
        if shine:
            sphere((s * spread - 0.02, y - 0.045, z + 0.04), size * 0.33, glow('#ffffff', 2), outline=False)


def glow_eyes(color, z=1.6, y=-0.44, spread=0.17, size=0.08):
    for s in (-1, 1):
        sphere((s * spread, y, z), size, glow(color, 6), scale=(1, 0.5, 1.2), outline=False)


def blush(z=1.47):
    for s in (-1, 1):
        sphere((s * 0.29, -0.4, z), 0.065, mat('#f29aa8'), scale=(1, 0.4, 0.6), outline=False)


def hair(style, c):
    if style == 'none':
        return
    m = mat(c)
    if style == 'tuft':
        cyl((0, 0, 2.15), 0.09, 0.25, m, r2=0.0)
        return
    sphere((0, 0.07, 1.7), 0.54, m, scale=(1, 1, 0.92))
    sphere((0, -0.3, 1.93), 0.3, m, scale=(1.5, 0.7, 0.55))
    if style == 'long':
        sphere((0, 0.25, 1.3), 0.45, m, scale=(1.05, 0.6, 1.35))
    elif style == 'pony':
        tube([(0, 0.45, 1.85), (0, 0.75, 1.6), (0, 0.7, 1.15), (0, 0.6, 0.95)], [0.16, 0.15, 0.1, 0.03], m)
    elif style == 'braids':
        for s in (-1, 1):
            tube([(s * 0.42, 0.05, 1.6), (s * 0.48, -0.05, 1.2), (s * 0.42, -0.1, 0.85)], [0.11, 0.09, 0.05], m)


def head(kind, skin, hair_style, hair_c, eye='#1b1426'):
    z = 1.62
    if kind in ('human', 'goblin'):
        sphere((0, 0, z), 0.5, mat(skin))
        eyes(color=eye)
        blush()
        hair(hair_style, hair_c)
        if kind == 'goblin':
            for s in (-1, 1):
                cyl((s * 0.62, 0.02, 1.7), 0.15, 0.55, mat(skin), r2=0.0, rot=(0, s * 75, 0))
    elif kind == 'bear':
        sphere((0, 0, z), 0.52, mat(skin))
        for s in (-1, 1):
            sphere((s * 0.34, 0.02, 2.04), 0.16, mat(skin))
            sphere((s * 0.34, -0.05, 2.04), 0.08, mat('#e0b48a'), outline=False)
        sphere((0, -0.42, 1.48), 0.22, mat('#e0b48a'), scale=(1.15, 0.9, 0.8))
        sphere((0, -0.6, 1.56), 0.075, mat('#1b1426', rough=0.2))
        eyes(z=1.7, y=-0.45, spread=0.19)
    elif kind == 'fox':
        sphere((0, 0, z), 0.5, mat(skin))
        for s in (-1, 1):
            cyl((s * 0.28, 0.02, 2.08), 0.17, 0.42, mat(skin), r2=0.0, rot=(0, s * 12, 0))
        cyl((0, -0.52, 1.5), 0.22, 0.42, mat('#fff4e6'), r2=0.03, rot=(90, 0, 0))
        sphere((0, -0.74, 1.5), 0.06, mat('#1b1426', rough=0.2))
        eyes(z=1.7, y=-0.43, spread=0.2)
    elif kind == 'rabbit':
        sphere((0, 0, z), 0.5, mat(skin))
        for sx in (-1, 1):
            sphere((sx * 0.18, 0.05, 2.38), 0.14, mat(skin), scale=(1, 0.6, 3.2), rot=(0, sx * 10, 0))
            sphere((sx * 0.18, -0.02, 2.38), 0.08, mat('#ffb3c6'), scale=(1, 0.4, 3.0), rot=(0, sx * 10, 0), outline=False)
        sphere((0, -0.48, 1.5), 0.06, mat('#ff8fab'))
        for sx in (-1, 1):
            sphere((sx * 0.1, -0.42, 1.44), 0.11, mat('#ffffff'), scale=(1, 0.7, 0.8), outline=False)
        eyes(z=1.66, y=-0.44, spread=0.19)
    elif kind == 'skull':
        sphere((0, 0, z + 0.03), 0.48, mat(skin), scale=(1, 1, 1.05))
        box((0, -0.25, 1.28), (0.48, 0.38, 0.22), mat(skin), bevel=0.05)
        for s in (-1, 1):
            sphere((s * 0.18, -0.38, 1.62), 0.13, mat('#120d18'), scale=(1, 0.5, 1.1), outline=False)
        glow_eyes(eye, z=1.62, y=-0.46, spread=0.18, size=0.055)
        hair(hair_style, hair_c)


# ---------------- body ----------------
def body(skin, c1, c2, robe=False, belly=False):
    if robe:
        cyl((0, 0, 0.6), 0.55, 1.2, mat(c1), r2=0.32)
    else:
        for s in (-1, 1):
            cyl((s * 0.17, 0, 0.3), 0.13, 0.45, mat(c2))
            sphere((s * 0.17, -0.06, 0.07), 0.15, mat(BOOT), scale=(1, 1.35, 0.65))
        cyl((0, 0, 0.88), 0.4, 0.7, mat(c1), r2=0.3, verts=24)
        torus((0, 0, 0.62), 0.38, 0.055, mat(c2))
    if belly:
        sphere((0, -0.12, 0.85), 0.48, mat(skin), scale=(1, 0.9, 0.9))
    sphere((0, 0, 1.18), 0.32, mat(c1), scale=(1.25, 1, 0.45))
    for s in (-1, 1):
        tube([(s * 0.36, 0, 1.15), (s * 0.5, -0.02, 0.95), (s * 0.55, -0.1, 0.76)], [0.11, 0.1, 0.09], mat(c1))
        sphere((s * 0.56, -0.12, 0.72), 0.11, mat(skin))


# ---------------- props ----------------
def prop(kind, c1='#ffffff', c2='#ffffff'):
    hy = -0.2
    if kind == 'sword':
        box((P, hy, 1.25), (0.09, 0.035, 0.9), steel())
        cyl((P, hy, 1.73), 0.045, 0.1, steel(), r2=0.0, verts=4)
        box((P, hy, 0.8), (0.34, 0.08, 0.07), gold())
        cyl((P, hy, 0.68), 0.04, 0.2, mat(WOOD))
    elif kind == 'greatsword':
        box((P + 0.05, hy, 1.45), (0.16, 0.045, 1.35), steel())
        cyl((P + 0.05, hy, 2.17), 0.08, 0.15, steel(), r2=0.0, verts=4)
        box((P + 0.05, hy, 0.78), (0.5, 0.1, 0.09), gold())
        sphere((P + 0.05, hy - 0.06, 0.78), 0.06, glow(c1, 3), outline=False)
    elif kind in ('shield', 'tower'):
        if kind == 'shield':
            cyl((-0.62, -0.28, 0.88), 0.42, 0.08, mat(c1), rot=(90, 0, 0), verts=32)
            torus((-0.62, -0.32, 0.88), 0.42, 0.04, gold(), rot=(90, 0, 0))
            sphere((-0.62, -0.34, 0.88), 0.11, mat(c2, rough=0.3, metal=0.7))
        else:
            box((-0.62, -0.28, 0.9), (0.62, 0.09, 0.8), mat(c1), bevel=0.05)
            box((-0.62, -0.34, 0.9), (0.12, 0.03, 0.55), mat(c2, rough=0.3, metal=0.7))
    elif kind == 'bow':
        x = -0.6
        pts = [(x + 0.08, -0.2, 1.55), (x - 0.18, -0.22, 1.2), (x - 0.24, -0.22, 0.85), (x - 0.18, -0.22, 0.5), (x + 0.08, -0.2, 0.15)]
        tube(pts, [0.02, 0.045, 0.055, 0.045, 0.02], mat(c1))
        tube([(x + 0.08, -0.2, 1.55), (x + 0.08, -0.2, 0.15)], [0.008, 0.008], mat('#f5efe0'), outline=False)
        cyl((0.22, 0.38, 1.15), 0.12, 0.55, mat(c2), rot=(-15, 25, 0))  # quiver on the back
    elif kind in ('staff', 'leafstaff', 'gearstaff', 'scythe', 'trident'):
        cyl((P + 0.05, -0.15, 1.0), 0.045, 2.0, mat(WOOD if kind != 'scythe' else '#3a2d3f'))
        top = (P + 0.05, -0.15, 2.05)
        if kind == 'staff':
            sphere(top, 0.17, glow(c1, 5), outline=False)
            torus(top, 0.2, 0.03, gold(), rot=(90, 0, 0))
            point(top, 30, c1, 0.1)
        elif kind == 'leafstaff':
            for a in range(5):
                ang = math.radians(a * 72)
                sphere((top[0] + 0.16 * math.cos(ang), top[1] + 0.16 * math.sin(ang), top[2]), 0.12,
                       mat('#5cc46a'), scale=(1.4, 0.6, 0.35), rot=(0, 0, a * 72))
            sphere(top, 0.09, glow('#fff07a', 4), outline=False)
        elif kind == 'gearstaff':
            torus(top, 0.2, 0.06, mat('#c9a14a', rough=0.3, metal=0.9), rot=(90, 0, 0))
            for a in range(8):
                ang = math.radians(a * 45)
                box((top[0] + 0.27 * math.cos(ang), top[1], top[2] + 0.27 * math.sin(ang)), (0.09, 0.09, 0.09),
                    mat('#c9a14a', rough=0.3, metal=0.9), rot=(0, -a * 45, 0))
            sphere(top, 0.1, glow('#6fe3ff', 5), outline=False)
        elif kind == 'scythe':
            tube([(top[0], top[1], top[2] - 0.05), (top[0] - 0.3, top[1], top[2] + 0.1), (top[0] - 0.65, top[1], top[2]),
                  (top[0] - 0.85, top[1], top[2] - 0.3)], [0.09, 0.08, 0.05, 0.005], mat('#cfd6e6', rough=0.25, metal=0.8))
        elif kind == 'trident':
            for dx in (-0.12, 0, 0.12):
                cyl((top[0] + dx, top[1], top[2] + 0.12), 0.035, 0.3, mat('#ffb02e', rough=0.3, metal=0.8), r2=0.0)
            box((top[0], top[1], top[2] - 0.03), (0.3, 0.05, 0.05), mat('#ffb02e', rough=0.3, metal=0.8))
    elif kind == 'crossbow':
        box((P, -0.45, 0.86), (0.09, 0.75, 0.1), mat(WOOD))
        tube([(P - 0.38, -0.72, 0.86), (P, -0.82, 0.9), (P + 0.38, -0.72, 0.86)], [0.03, 0.05, 0.03], mat(c1, rough=0.3, metal=0.7))
        tube([(P - 0.38, -0.72, 0.86), (P, -0.5, 0.88), (P + 0.38, -0.72, 0.86)], [0.008, 0.008, 0.008], mat('#f5efe0'), outline=False)
        box((P, -0.68, 0.93), (0.03, 0.4, 0.03), mat('#cfd6e6', metal=0.8, rough=0.3))
    elif kind == 'tome':
        box((-0.62, -0.35, 1.05), (0.42, 0.12, 0.5), mat(c1), rot=(0, 0, 20), bevel=0.02)
        box((-0.6, -0.42, 1.05), (0.36, 0.03, 0.42), glow(c2, 2), rot=(0, 0, 20), outline=False)
    elif kind == 'hammer':
        cyl((P + 0.2, -0.15, 0.85), 0.05, 1.1, mat(WOOD))
        box((P + 0.2, -0.15, 1.42), (0.32, 0.5, 0.3), mat(c1, rough=0.3, metal=0.8), bevel=0.05)
        box((P + 0.37, -0.15, 1.42), (0.02, 0.22, 0.18), glow('#7fd6ff', 3), outline=False)
    elif kind == 'club':
        tube([(P, -0.18, 0.55), (P + 0.02, -0.18, 1.1), (P + 0.05, -0.18, 1.7)], [0.07, 0.15, 0.24], mat(c1))
    elif kind == 'daggers':
        for s in (-1, 1):
            box((s * 0.56, -0.28, 0.95), (0.07, 0.03, 0.42), steel(), rot=(-25, 0, 0))
            box((s * 0.56, -0.18, 0.74), (0.18, 0.06, 0.05), mat(c1))
    elif kind == 'bomb':
        sphere((P + 0.02, -0.3, 0.88), 0.22, mat('#2d2a3a', rough=0.3, metal=0.4))
        tube([(P + 0.02, -0.3, 1.09), (P + 0.1, -0.3, 1.2), (P + 0.18, -0.32, 1.22)], [0.03, 0.025, 0.02], mat('#c9a66b'))
        sphere((P + 0.2, -0.33, 1.24), 0.07, glow('#ffb02e', 8), outline=False)


# ---------------- accessories ----------------
def acc(kind, skin, c1, c2, hair_c):
    if kind == 'halo':
        torus((0, 0.05, 2.32), 0.3, 0.035, glow(GOLD, 4), outline=False)
    elif kind == 'wings':
        for s in (-1, 1):
            sphere((s * 0.6, 0.4, 1.4), 0.45, mat('#ffffff'), scale=(1.25, 0.22, 0.75), rot=(0, -s * 25, 0))
            sphere((s * 0.85, 0.45, 1.65), 0.32, mat('#fdf6e3'), scale=(1.3, 0.2, 0.6), rot=(0, -s * 35, 0))
    elif kind == 'mothwings':
        for s in (-1, 1):
            sphere((s * 0.7, 0.4, 1.55), 0.5, mat(c2), scale=(1.2, 0.12, 0.9), rot=(0, -s * 30, 0))
            sphere((s * 0.55, 0.4, 0.95), 0.32, mat(c1), scale=(1.1, 0.12, 0.9), rot=(0, s * 20, 0))
            sphere((s * 0.8, 0.33, 1.65), 0.12, glow('#ffd1ff', 3), scale=(1, 0.3, 1), outline=False)
    elif kind == 'batwings':
        for s in (-1, 1):
            cyl((s * 0.65, 0.35, 1.3), 0.5, 0.75, mat(c2), r2=0.0, verts=3, scale=(1, 0.12, 1), rot=(0, s * 70, 0))
    elif kind == 'elf_ears':
        for s in (-1, 1):
            cyl((s * 0.52, 0.02, 1.68), 0.09, 0.38, mat(skin), r2=0.0, rot=(0, s * 70, 0))
    elif kind == 'wizhat':
        cyl((0, 0.02, 2.02), 0.68, 0.06, mat(c2), verts=32)
        tube([(0, 0.02, 2.02), (0, 0.06, 2.5), (0.1, 0.2, 2.9), (0.3, 0.38, 3.0)], [0.44, 0.26, 0.1, 0.01], mat(c2))
        torus((0, 0.02, 2.1), 0.42, 0.045, gold())
        sphere((0.3, 0.38, 3.0), 0.07, glow(GOLD, 3), outline=False)
    elif kind in ('helmet', 'horned'):
        sphere((0, 0.02, 1.76), 0.55, mat(c2, rough=0.3, metal=0.8), scale=(1, 1, 0.82))
        box((0, -0.53, 1.6), (0.07, 0.05, 0.3), mat(c2, rough=0.3, metal=0.8))
        if kind == 'horned':
            for s in (-1, 1):
                tube([(s * 0.45, 0, 1.9), (s * 0.7, -0.05, 2.1), (s * 0.72, -0.05, 2.4)], [0.09, 0.06, 0.01], mat('#f5efe0'))
    elif kind == 'plume':
        tube([(0, 0.05, 2.2), (0, 0.35, 2.35), (0, 0.65, 2.1)], [0.1, 0.12, 0.04], mat('#d94a3d'))
    elif kind == 'hood':
        sphere((0, 0.16, 1.7), 0.58, mat(c2), scale=(1.02, 1, 1.05))
        tube([(0, 0.4, 2.1), (0, 0.7, 2.0), (0, 0.85, 1.75)], [0.18, 0.1, 0.02], mat(c2))
    elif kind == 'cape':
        sphere((0, 0.33, 0.85), 0.52, mat(c2), scale=(1.05, 0.22, 1.5))
    elif kind == 'crown':
        torus((0, 0.02, 2.08), 0.27, 0.05, gold())
        for a in range(5):
            ang = math.radians(a * 72 + 90)
            cyl((0.27 * math.cos(ang), 0.02 + 0.27 * math.sin(ang), 2.2), 0.06, 0.22, gold(), r2=0.0)
        sphere((0, -0.26, 2.1), 0.06, glow('#ff4d6d', 2), outline=False)
    elif kind == 'goggles':
        torus((0, 0.02, 1.85), 0.5, 0.04, mat('#5a3d2b'))
        for s in (-1, 1):
            torus((s * 0.2, -0.43, 1.88), 0.11, 0.04, mat('#c9a14a', rough=0.3, metal=0.9), rot=(80, 0, 0))
            sphere((s * 0.2, -0.43, 1.88), 0.09, mat('#7fd6ff', rough=0.1), scale=(1, 0.4, 1), outline=False)
    elif kind == 'leafcrown':
        torus((0, 0.02, 1.98), 0.42, 0.05, mat('#4c9a4a'))
        for a in range(7):
            ang = math.radians(a * 51)
            sphere((0.42 * math.cos(ang), 0.02 + 0.42 * math.sin(ang), 2.03), 0.1, mat('#6fd36a'), scale=(1.5, 0.6, 0.5), rot=(0, 0, a * 51))
        sphere((-0.3, -0.3, 2.05), 0.07, mat('#ff9ad5'), outline=False)
    elif kind == 'antennae':
        for s in (-1, 1):
            tube([(s * 0.15, 0, 2.05), (s * 0.3, -0.1, 2.4), (s * 0.45, -0.05, 2.55)], [0.03, 0.025, 0.02], mat(DARK))
            sphere((s * 0.45, -0.05, 2.57), 0.07, glow('#ffd1ff', 3), outline=False)
    elif kind == 'batears':
        for s in (-1, 1):
            cyl((s * 0.32, 0.02, 2.08), 0.18, 0.48, mat(c2), r2=0.0, rot=(0, s * 18, 0))
    elif kind == 'foxtail':
        tube([(0, 0.3, 0.5), (0.3, 0.75, 0.6), (0.5, 0.9, 1.0), (0.45, 0.85, 1.3)], [0.08, 0.22, 0.24, 0.05], mat(skin))
        sphere((0.45, 0.85, 1.32), 0.12, mat('#fff4e6'))
    elif kind == 'beard':
        sphere((0, -0.36, 1.32), 0.3, mat(hair_c), scale=(1, 0.6, 1.1))
    elif kind == 'horns':
        for s in (-1, 1):
            tube([(s * 0.25, 0, 2.0), (s * 0.4, 0, 2.25), (s * 0.35, 0.05, 2.45)], [0.09, 0.06, 0.005], mat('#2d1d2f'))
    elif kind == 'tusks':
        for s in (-1, 1):
            cyl((s * 0.16, -0.46, 1.42), 0.05, 0.2, mat('#fff4e6'), r2=0.0)
    elif kind == 'devtail':
        tube([(0, 0.3, 0.6), (0.2, 0.7, 0.5), (0.45, 0.8, 0.8)], [0.05, 0.04, 0.03], mat(skin))
        cyl((0.48, 0.82, 0.9), 0.1, 0.18, mat(skin), r2=0.0, verts=4)
    elif kind == 'ribs':
        for z in (0.78, 0.92, 1.06):
            torus((0, 0, z), 0.36, 0.025, mat('#8a8070'), scale=(1, 1, 1))
    elif kind == 'moon':
        sphere((-0.5, 0.25, 2.25), 0.2, glow('#d9c7ff', 3), outline=False)


def humanoid(skin, c1, c2, hair_c='#4a3020', hair_style='short', headkind='human', accs=(), props=(),
             eye='#1b1426', robe=False, belly=False, pc1=None, pc2=None):
    body(skin, c1, c2, robe=robe, belly=belly)
    head(headkind, skin, hair_style, hair_c, eye)
    for a in accs:
        acc(a, skin, c1, c2, hair_c)
    for p in props:
        prop(p, pc1 or c1, pc2 or c2)


# ---------------- monsters ----------------
def wolf():
    g, l = mat('#7c8494'), mat('#c9cfd8')
    sphere((0, 0.1, 0.8), 0.55, g, scale=(0.75, 1.45, 0.8))
    sphere((0, -0.55, 0.85), 0.4, l, scale=(0.9, 0.7, 0.9))
    for x, y in ((-0.25, -0.45), (0.25, -0.45), (-0.25, 0.65), (0.25, 0.65)):
        cyl((x, y, 0.3), 0.11, 0.6, g)
        sphere((x, y - 0.04, 0.05), 0.12, mat('#4a5060'), scale=(1, 1.3, 0.6))
    sphere((0, -0.85, 1.25), 0.38, g)
    cyl((0, -1.2, 1.15), 0.2, 0.42, l, r2=0.05, rot=(90, 0, 0))
    sphere((0, -1.42, 1.17), 0.06, mat('#1b1426', rough=0.2))
    for s in (-1, 1):
        cyl((s * 0.2, -0.8, 1.62), 0.12, 0.35, g, r2=0.0, rot=(0, s * 15, 0))
    glow_eyes('#ffd84a', z=1.33, y=-1.12, spread=0.15, size=0.06)
    tube([(0, 0.95, 0.95), (0, 1.3, 1.2), (0, 1.4, 1.55)], [0.12, 0.16, 0.06], g)


def spider():
    m = mat('#3d2b52')
    sphere((0, 0.5, 0.8), 0.62, m, scale=(1, 1.1, 0.9))
    sphere((0, 0.55, 1.36), 0.18, glow('#ff4d6d', 1.5), scale=(1, 1, 0.3), outline=False)
    sphere((0, -0.25, 0.65), 0.38, mat('#4f3a6b'))
    for i in range(4):
        for s in (-1, 1):
            y = -0.4 + i * 0.25
            tube([(s * 0.25, y, 0.65), (s * 0.85, y - 0.15 + i * 0.1, 1.15), (s * 1.2, y - 0.3 + i * 0.25, 0.0)],
                 [0.07, 0.06, 0.02], mat('#2b1f3a'))
    for dx, dz, r in ((-0.12, 0.78, 0.07), (0.12, 0.78, 0.07), (-0.22, 0.7, 0.045), (0.22, 0.7, 0.045)):
        sphere((dx, -0.6, dz), r, glow('#ff3b3b', 6), outline=False)
    for s in (-1, 1):
        cyl((s * 0.08, -0.6, 0.45), 0.04, 0.2, mat('#f5efe0'), r2=0.0, rot=(180, 0, 0))


def bat():
    b = mat('#6b4a3a')
    sphere((0, 0, 1.15), 0.35, b, scale=(1, 0.9, 1.1))
    sphere((0, -0.1, 1.62), 0.3, b)
    for s in (-1, 1):
        cyl((s * 0.18, -0.05, 1.95), 0.11, 0.3, b, r2=0.0)
        sphere((s * 0.85, 0.05, 1.35), 0.6, mat('#3d2a2a'), scale=(1.15, 0.08, 0.6), rot=(0, -s * 15, 0))
        tube([(s * 0.3, 0, 1.4), (s * 0.9, 0, 1.75), (s * 1.45, 0.05, 1.5)], [0.04, 0.035, 0.02], b)
        cyl((s * 0.06, -0.36, 1.48), 0.03, 0.1, mat('#ffffff'), r2=0.0, rot=(180, 0, 0))
    glow_eyes('#ff4d4d', z=1.68, y=-0.37, spread=0.11, size=0.06)


def wraith():
    sphere((0, 0, 0.95), 0.1, mat('#000000'), outline=False)
    cyl((0, 0.05, 0.85), 0.55, 1.5, mat('#9fe8f0', emit=0.4), r2=0.2)
    sphere((0, 0.05, 1.7), 0.42, mat('#2a3a5c'), scale=(1, 1, 1.1))
    sphere((0, -0.12, 1.65), 0.3, mat('#0a0a14'), scale=(1, 0.8, 1))
    glow_eyes('#7ffcff', z=1.68, y=-0.35, spread=0.11, size=0.06)
    for s in (-1, 1):
        tube([(s * 0.35, 0, 1.35), (s * 0.65, -0.2, 1.1), (s * 0.75, -0.35, 0.9)], [0.1, 0.08, 0.03], mat('#9fe8f0', emit=0.4))
    for x in (-0.3, 0, 0.3):
        tube([(x, 0, 0.15), (x * 1.3, 0.1, -0.15), (x * 1.6, 0.3, -0.3)], [0.15, 0.08, 0.01], mat('#9fe8f0', emit=0.4))


def golem():
    st, dk = mat('#8d8a86'), mat('#6d6a66')
    box((0, 0, 1.2), (1.15, 0.8, 1.0), st, bevel=0.12)
    box((0, -0.05, 2.0), (0.6, 0.55, 0.5), st, bevel=0.1)
    for s in (-1, 1):
        box((s * 0.8, -0.05, 1.05), (0.4, 0.45, 1.05), dk, bevel=0.08)
        box((s * 0.82, -0.08, 0.38), (0.5, 0.55, 0.4), st, bevel=0.08)
        box((s * 0.3, 0, 0.35), (0.38, 0.45, 0.7), dk, bevel=0.08)
        sphere((s * 0.45, -0.1, 1.72), 0.16, mat('#5c9a4a'), scale=(1.2, 1, 0.5))
    glow_eyes('#7ffcff', z=2.02, y=-0.32, spread=0.14, size=0.07)
    box((0, -0.41, 1.25), (0.3, 0.02, 0.3), glow('#7ffcff', 3), rot=(0, 45, 0), outline=False)


def wyrm():
    r, belly = mat('#c8382f'), mat('#f2c48a')
    sphere((0, 0.3, 1.0), 0.75, r, scale=(0.9, 1.35, 0.9))
    sphere((0, -0.1, 0.9), 0.55, belly, scale=(0.8, 0.9, 1))
    tube([(0, -0.3, 1.3), (0, -0.7, 1.8), (0, -0.85, 2.25)], [0.32, 0.26, 0.22], r)
    sphere((0, -0.95, 2.35), 0.4, r, scale=(1, 1.25, 0.85))
    box((0, -1.35, 2.25), (0.4, 0.5, 0.28), r, bevel=0.08)
    for s in (-1, 1):
        tube([(s * 0.2, -0.75, 2.6), (s * 0.35, -0.45, 2.85), (s * 0.4, -0.1, 2.95)], [0.09, 0.06, 0.01], mat('#f5efe0'))
        sphere((s * 1.25, 0.5, 1.95), 0.9, mat('#8a2a2a'), scale=(1.3, 0.08, 0.75), rot=(0, -s * 25, 0))
        tube([(s * 0.4, 0.3, 1.6), (s * 1.2, 0.4, 2.5), (s * 2.1, 0.5, 2.0)], [0.08, 0.06, 0.02], r)
        for y in (-0.3, 0.8):
            cyl((s * 0.35, y, 0.3), 0.16, 0.6, r)
    glow_eyes('#ffd84a', z=2.45, y=-1.25, spread=0.2, size=0.07)
    tube([(0, 1.2, 0.9), (0.3, 1.8, 0.6), (0.8, 2.1, 0.5), (1.2, 2.1, 0.7)], [0.35, 0.25, 0.12, 0.02], r)
    for i in range(5):
        cyl((0, -0.2 + i * 0.35, 1.72 - abs(i - 1.5) * 0.08), 0.12, 0.3, mat('#f2c14e'), r2=0.0)


def kraken():
    m = mat('#7b4fd1')
    sphere((0, 0, 1.6), 0.85, m, scale=(1, 1, 1.2))
    for s in (-1, 1):
        sphere((s * 0.33, -0.7, 1.45), 0.2, mat('#fff4e6'))
        sphere((s * 0.33, -0.86, 1.45), 0.1, mat('#1b1426', rough=0.2), outline=False)
    for i, (x, y, z) in enumerate([(0.4, -0.3, 1.9), (-0.45, -0.25, 2.2), (0.15, -0.55, 2.3)]):
        sphere((x, y, z), 0.1, mat('#b38cff'), scale=(1, 0.5, 1), outline=False)
    for i in range(8):
        a = math.radians(i * 45 + 22)
        c, sn = math.cos(a), math.sin(a)
        tube([(0.5 * c, 0.5 * sn, 0.9), (1.1 * c, 1.1 * sn, 0.35), (1.6 * c, 1.6 * sn, 0.45),
              (1.8 * c, 1.8 * sn, 0.95), (1.55 * c, 1.55 * sn, 1.15)], [0.22, 0.17, 0.12, 0.07, 0.02], mat('#6a40bb'))


def slime():
    sphere((0, 0, 0.55), 0.75, mat('#5fd36a', rough=0.15, emit=0.15), scale=(1, 0.95, 0.75))
    sphere((-0.25, -0.4, 0.95), 0.12, glow('#ffffff', 1.5), scale=(1.4, 0.5, 0.8), outline=False)
    eyes(z=0.72, y=-0.66, spread=0.2, size=0.09)
    sphere((0, -0.68, 0.5), 0.06, mat('#1b1426'), scale=(1.6, 0.4, 0.6), outline=False)


def treant():
    bark, leaf = mat('#6b4a2e'), mat('#4f9a45')
    tube([(0, 0, 0), (0, 0, 1.0), (0, 0, 2.0)], [0.5, 0.42, 0.36], bark)
    for sx in (-1, 1):
        tube([(sx * 0.35, 0, 1.4), (sx * 0.8, -0.1, 1.2), (sx * 1.0, -0.25, 0.75)], [0.16, 0.12, 0.06], bark)
        tube([(sx * 0.3, 0, 0.2), (sx * 0.65, -0.1, 0.05), (sx * 0.85, -0.2, 0.0)], [0.15, 0.1, 0.04], bark)
    for dx, dy, dz, r in ((0, 0, 2.4, 0.75), (0.5, 0.1, 2.15, 0.5), (-0.5, 0.05, 2.2, 0.55), (0, -0.2, 2.8, 0.45)):
        sphere((dx, dy, dz), r, leaf, seg=16, rings=10)
    glow_eyes('#ffd84a', z=1.6, y=-0.42, spread=0.15, size=0.07)
    box((0, -0.43, 1.3), (0.3, 0.05, 0.08), mat('#2b1d14'), outline=False)


def fire_sprite():
    cyl((0, 0, 0.85), 0.55, 1.6, mat('#ff5a1a', emit=1.6, rough=0.4), r2=0.0, verts=10)
    for sx, h in ((-1, 0.7), (1, 0.85)):
        cyl((sx * 0.3, 0.05, 1.05), 0.2, h, mat('#ff8a2a', emit=1.8), r2=0.0, verts=8, rot=(0, sx * 30, 0))
    cyl((0, 0.05, 1.15), 0.25, 1.0, mat('#ffd84a', emit=2.0), r2=0.0, verts=8, outline=False)
    for sx in (-1, 1):
        sphere((sx * 0.13, -0.38, 0.72), 0.085, mat('#2b0d05', rough=0.2), scale=(1, 0.5, 1.3), outline=False)
        sphere((sx * 0.13 - 0.02, -0.42, 0.76), 0.03, glow('#ffffff', 2), outline=False)
    sphere((0, 0, 0.18), 0.4, mat('#ff4a1a', emit=1.5), scale=(1, 1, 0.35))


# ---------------- roster ----------------
SPRITES = {
    # Dawnguard
    'hero_seraphine': lambda: humanoid('#ffe1cc', '#fff6e0', GOLD, '#ffd56b', 'long', accs=('halo', 'wings'), props=('staff',), pc1='#fff07a', robe=True),
    'hero_corwin': lambda: humanoid('#e8b48a', '#d94a3d', GOLD, '#6b3b1f', 'short', accs=('cape', 'beard'), props=('greatsword',), pc1='#ff6b4a'),
    'hero_mira': lambda: humanoid('#ffd9bd', '#f29b38', '#7a4a2a', '#c8452f', 'pony', props=('bow',), pc1=WOOD, pc2='#7a4a2a'),
    'hero_tobin': lambda: humanoid('#f0c7a0', '#dbe4ee', '#9aa7b4', '#8a5a35', 'short', accs=('helmet', 'plume'), props=('shield', 'sword'), pc1='#3f6fd1', pc2=GOLD),
    # Wildroot
    'hero_thorne': lambda: humanoid('#f6dcc2', '#3f8f4a', '#2d5e33', '#e6eef2', 'long', accs=('elf_ears', 'hood', 'cape'), props=('bow',), pc1='#c9a14a', pc2='#6b4a2a'),
    'hero_wren': lambda: humanoid('#ffe1cc', '#8fd17a', '#5c8f4a', '#8a5a35', 'braids', accs=('leafcrown',), props=('leafstaff',), robe=True),
    'hero_grukk': lambda: humanoid('#8a5a35', '#6b8f3a', '#4a3a2a', '#000', 'none', headkind='bear', props=('shield', 'club'), pc1='#7a5230', pc2='#c9a14a'),
    'hero_fen': lambda: humanoid('#e8803a', '#3f6b4a', '#2b3a2f', '#000', 'none', headkind='fox', accs=('foxtail',), props=('daggers',), pc1='#c9a14a'),
    # Ironveil
    'hero_valka': lambda: humanoid('#ffd9bd', '#3f6fa8', '#9aa7b4', '#d9502f', 'braids', accs=('horned', 'cape'), props=('hammer',), pc1='#9aa7b4'),
    'hero_ozzik': lambda: humanoid('#f0c7a0', '#6f8fb4', '#7a5230', '#eef2f6', 'short', accs=('goggles', 'beard'), props=('gearstaff',)),
    'hero_hela': lambda: humanoid('#e8b48a', '#7f99b8', '#4f5f72', '#2d2a3a', 'short', accs=('helmet',), props=('tower', 'hammer'), pc1='#4f6f9a', pc2='#c9a14a'),
    'hero_pim': lambda: humanoid('#ffe1cc', '#f2903a', '#3f5f8a', '#f2c14e', 'short', accs=('goggles',), props=('bomb',)),
    # Duskborn
    'hero_nyx': lambda: humanoid('#e9dcf5', '#3a2a5c', '#2a1f45', '#f0eaff', 'long', accs=('hood', 'moon'), props=('staff',), pc1='#b48cff', robe=True, eye='#7a3fd1'),
    'hero_lorcan': lambda: humanoid('#efe9dc', '#2d2a3a', '#3a2d3f', '#000', 'none', headkind='skull', accs=('cape', 'crown'), props=('scythe',), eye='#7ffcff'),
    'hero_sable': lambda: humanoid('#efe0ea', '#6b2a3a', '#3a1f2a', '#1f1a2a', 'short', accs=('batears', 'cape'), props=('bow',), pc1='#3a2d3f', pc2='#6b2a3a', eye='#c0304a'),
    'hero_vesper': lambda: humanoid('#ffe6f2', '#b48cff', '#7a5ad1', '#ffffff', 'short', accs=('antennae', 'mothwings'), props=('staff',), pc1='#ff9ad5', robe=True),
    # Back-line archers and wizards
    'hero_lumen': lambda: humanoid('#ffd9bd', '#f2903a', '#c0392b', '#d9502f', 'short', accs=('wizhat', 'cape'), props=('staff',), pc1='#ff8a2a', robe=True),
    'hero_kestrel': lambda: humanoid('#f0c7a0', '#e8c25a', '#7a5a2a', '#f2d06b', 'short', accs=('cape',), props=('crossbow',), pc1='#9aa7b4', pc2='#b84a3a'),
    'hero_oona': lambda: humanoid('#e6f2d8', '#5c8f4a', '#3f6b3a', '#9a5ad1', 'braids', accs=('wizhat',), props=('staff', 'tome'), pc1='#7dff7a', pc2='#7dff7a', robe=True),
    'hero_hopper': lambda: humanoid('#f4ede4', '#4f9a45', '#7a5230', '#000', 'none', headkind='rabbit', props=('bow',), pc1='#c9a14a', pc2='#7a5230'),
    'hero_gunnar': lambda: humanoid('#e8b48a', '#4f6f9a', '#6b7a8a', '#b8742e', 'short', accs=('helmet', 'beard'), props=('crossbow',), pc1='#c9a14a'),
    'hero_aurelia': lambda: humanoid('#ffe6d6', '#3a6fd1', '#1f3f8a', '#f0f4ff', 'long', accs=('wizhat', 'cape'), props=('staff',), pc1='#7fd6ff', robe=True),
    'hero_morwen': lambda: humanoid('#efe0f5', '#3a2450', '#5a2a7a', '#1f1a2a', 'long', accs=('wizhat',), props=('staff', 'tome'), pc1='#c77dff', pc2='#c77dff', robe=True, eye='#7a3fd1'),
    'hero_vael': lambda: humanoid('#d8d0f0', '#2a2440', '#1a1630', '#e8e0ff', 'long', accs=('elf_ears', 'hood', 'cape'), props=('bow',), pc1='#b48cff', pc2='#3a2d5c', eye='#b48cff'),
    # Monsters
    'mon_slime': slime,
    'mon_treant': treant,
    'mon_goblin_archer': lambda: humanoid('#7fbf4d', '#6b4a2a', '#4f3a26', '#000', 'none', headkind='goblin', accs=('hood',), props=('bow',), pc1='#8a5a35', pc2='#5a3d22', eye='#d1ff3a'),
    'mon_cultist': lambda: humanoid('#d8c8c0', '#5a1f2a', '#3a1420', '#000', 'none', accs=('hood',), props=('staff',), pc1='#c77dff', robe=True, eye='#ff4d6d'),
    'mon_fire_sprite': fire_sprite,
    'mon_goblin': lambda: humanoid('#7fbf4d', '#7a5230', '#4f3a26', '#000', 'tuft', headkind='goblin', props=('daggers',), pc1='#4f3a26', eye='#d1ff3a'),
    'mon_wolf': wolf,
    'mon_skeleton': lambda: humanoid('#efe9dc', '#efe9dc', '#bfb5a0', '#000', 'none', headkind='skull', accs=('ribs',), props=('sword', 'shield'), pc1='#8a5a35', pc2='#9aa7b4', eye='#ff8a3a'),
    'mon_spider': spider,
    'mon_bat': bat,
    'mon_wraith': wraith,
    'mon_imp': lambda: humanoid('#d9443a', '#3a1f2a', '#2a1a20', '#000', 'none', accs=('horns', 'batwings', 'devtail'), props=('trident',), pc2='#5a2a3a', eye='#ffd84a'),
    'mon_golem': golem,
    # Bosses
    'boss_ogre': lambda: humanoid('#8fae5a', '#7a5230', '#4f3a26', '#3a2a1a', 'tuft', belly=True, accs=('crown', 'tusks'), props=('club',), pc1='#6b4a2a'),
    'boss_wyrm': wyrm,
    'boss_lich': lambda: humanoid('#e8f2d8', '#2a2140', '#1a142a', '#000', 'none', headkind='skull', accs=('crown', 'cape'), props=('staff',), pc1='#7dff7a', robe=True, eye='#7dff7a'),
    'boss_kraken': kraken,
}
TURN = {'mon_wolf': -35, 'boss_wyrm': -30, 'mon_spider': -20}


def build(name, side=False):
    reset(transparent=True, samples=40)
    world_color('#9a94b8', 0.7)
    SPRITES[name]()
    add_outlines(0.032)
    if name in TURN and not side:
        bpy.ops.object.empty_add(location=(0, 0, 0))
        pivot = bpy.context.object
        for o in bpy.context.scene.objects:
            if o is not pivot and o.type in ('MESH', 'LIGHT'):
                o.parent = pivot
        pivot.rotation_euler[2] = math.radians(TURN[name])
    sun((48, 0, -35), 3.2, '#fff4e0')
    sun((65, 0, 110), 1.0, '#c9d8ff')
    sun((-120, 0, 15), 2.0, '#ffe6c0')
    # Portrait: three-quarter front view. Side: three-quarter view facing screen-left (allies in battle;
    # the game mirrors it for enemies).
    cam = camera((6.2, -5.0, 3.6) if side else (3.2, -7.5, 4.2), (0, 0, 1.1), ortho=4)
    frame_ortho(cam, 1.08)
    render(os.path.join(OUT, name + ('_side' if side else '') + '.webp'), 256, 256)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith('-')] or list(SPRITES)
    for n in names:
        n = n if n in SPRITES else next(k for k in SPRITES if k.endswith('_' + n))
        build(n)
        build(n, side=True)
        print('rendered', n, flush=True)
