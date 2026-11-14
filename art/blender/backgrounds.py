"""Renders the battle arenas (one per chapter) and the camp banner to assets/bg/*.webp.

    python art/blender/backgrounds.py            # everything
    python art/blender/backgrounds.py camp ch3   # only these
"""
import os
import sys
import math
import random
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

OUT = os.path.join(ROOT, 'assets', 'bg')
R = random.Random()


def ground(c1, c2, size=(40, 50), shine=0.8, loc=(0, 0, 0), scale_noise=0.35):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    g = bpy.context.object
    g.scale = (size[0], size[1], 1)
    g['outline'] = False
    m = bpy.data.materials.new('ground')
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Roughness'].default_value = shine
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise')
    n1.inputs['Scale'].default_value = scale_noise
    n1.inputs['Detail'].default_value = 4
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = (*hx(c2), 1)
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = (*hx(c1), 1)
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector'])
    nt.links.new(n1.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    g.data.materials.append(m)
    return g


def disc(x, y, r, c, rough=0.8, z=0.01, sx=1.0, emit=0, sy=1.0):
    o = cyl((x, y, z), r, 0.02, mat(c, rough=rough, emit=emit), verts=48, scale=(sx, sy, 1), outline=False)
    return o


# ---------------- props ----------------
def tree_round(x, y, k, leaf):
    cyl((x, y, 0.7 * k), 0.22 * k, 1.4 * k, mat('#7a4f2e'))
    for dx, dy, dz, r in ((0, 0, 1.9, 1.0), (0.55, 0.2, 1.55, 0.7), (-0.5, -0.1, 1.6, 0.75), (0.1, -0.3, 2.45, 0.6)):
        sphere((x + dx * k, y + dy * k, dz * k), r * k, mat(leaf), seg=16, rings=10)


def tree_pine(x, y, k, leaf, snow=False):
    cyl((x, y, 0.4 * k), 0.18 * k, 0.8 * k, mat('#6b442a'))
    for i, (z, r, d) in enumerate(((1.1, 1.0, 1.4), (1.85, 0.78, 1.2), (2.5, 0.55, 1.0))):
        cyl((x, y, z * k), r * k, d * k, mat(leaf), r2=0.0, verts=10)
        if snow:
            cyl((x, y, (z + d * 0.28) * k), r * 0.45 * k, d * 0.45 * k, mat('#f4f8ff'), r2=0.0, verts=10)


def tree_dead(x, y, k, c):
    m = mat(c)
    tube([(x, y, 0), (x + 0.1 * k, y, 1.2 * k), (x - 0.1 * k, y, 2.4 * k)], [0.25 * k, 0.16 * k, 0.04 * k], m)
    for a, h in ((30, 1.4), (200, 1.8), (110, 2.1)):
        c_, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        tube([(x, y, h * k), (x + 0.6 * c_ * k, y + 0.6 * s_ * k, (h + 0.4) * k), (x + 0.9 * c_ * k, y + 0.9 * s_ * k, (h + 0.9) * k)],
             [0.09 * k, 0.05 * k, 0.01 * k], m)


def rock(x, y, k, c, snow=False):
    ico((x, y, 0.15 * k), 0.6 * k, mat(c, rough=0.9), scale=(1 + R.random() * 0.5, 1 + R.random() * 0.3, 0.6 + R.random() * 0.3),
        rot=(0, 0, R.random() * 360))
    if snow:
        ico((x, y, 0.42 * k), 0.42 * k, mat('#f4f8ff'), scale=(1.2, 1.1, 0.35))


def bush(x, y, k, c):
    for dx, dy, r in ((0, 0, 0.55), (0.45, 0.1, 0.4), (-0.4, 0.05, 0.42)):
        sphere((x + dx * k, y + dy * k, r * 0.7 * k), r * k, mat(c), seg=14, rings=8)
    if R.random() < 0.5:
        for _ in range(3):
            sphere((x + R.uniform(-0.5, 0.5) * k, y - 0.35 * k, R.uniform(0.3, 0.7) * k), 0.07 * k, mat('#e8434a'), outline=False)


def flower(x, y, c):
    tube([(x, y, 0), (x, y, 0.22)], [0.015, 0.015], mat('#3f7a3a'), outline=False)
    sphere((x, y, 0.25), 0.08, mat(c), scale=(1, 1, 0.6), outline=False)
    sphere((x, y, 0.29), 0.035, mat('#ffd84a'), outline=False)


def tuft(x, y, c):
    for a in (-20, 0, 20):
        cyl((x + a * 0.004, y, 0.12), 0.04, 0.28, mat(c), r2=0.0, verts=5, rot=(0, a, 0), outline=False)


def mushroom(x, y, k, cap, glow_s=0):
    cyl((x, y, 0.2 * k), 0.08 * k, 0.4 * k, mat('#f2e6d0'))
    sphere((x, y, 0.4 * k), 0.28 * k, mat(cap, emit=glow_s), scale=(1, 1, 0.55))
    if glow_s:
        point((x, y, 0.8 * k), 25 * k, cap, 0.3)


def crystal(x, y, k, c, light=True):
    for a, tilt, h in ((0, 0, 1.4), (120, 25, 0.9), (240, -25, 1.0)):
        cyl((x + 0.15 * math.cos(math.radians(a)) * k, y + 0.15 * math.sin(math.radians(a)) * k, h * 0.45 * k),
            0.18 * k, h * k, mat(c, emit=2.5, rough=0.2), r2=0.0, verts=5, rot=(tilt, 0, a))
    if light:
        point((x, y, 1.0 * k), 60 * k, c, 0.4)


def pillar(x, y, k, c):
    h = R.uniform(1.2, 3.0) * k
    box((x, y, 0.15 * k), (0.9 * k, 0.9 * k, 0.3 * k), mat(c), bevel=0.04)
    cyl((x, y, 0.3 * k + h / 2), 0.32 * k, h, mat(c), verts=12)
    if R.random() < 0.6:
        cyl((x + 0.8 * k, y - 0.3 * k, 0.28 * k), 0.28 * k, 0.9 * k, mat(c), verts=12, rot=(90, 0, R.uniform(0, 180)))


def coral(x, y, k, c):
    for a in (0, 70, 150, 230):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        tube([(x, y, 0), (x + 0.2 * ca * k, y + 0.2 * sa * k, 0.4 * k), (x + 0.35 * ca * k, y + 0.35 * sa * k, 0.8 * k)],
             [0.1 * k, 0.07 * k, 0.03 * k], mat(c))


def log(x, y, k, c='#7a4f2e'):
    cyl((x, y, 0.22 * k), 0.22 * k, 1.6 * k, mat(c), rot=(90, 0, R.uniform(0, 180)))


def ember(x, y):
    sphere((x, y, R.uniform(0.05, 0.6)), R.uniform(0.03, 0.06), glow('#ff8a2a', 8), outline=False)


def glow(c, s):
    return mat(c, emit=s)


# ---------------- chapters ----------------
CHAPTERS = {
    'ch1': dict(name='Mistvale Meadows', g=('#86c766', '#6bb156'), clearing='#9fd47a', world=('#c9dcff', 0.9), sun=('#fff1d6', 3.2),
                big=[('tree_round', '#4fa64a', 0.5), ('tree_round', '#6cbf4a', 0.2), ('bush', '#4f9a45', 0.2), ('rock', '#a3a7ad', 0.1)],
                small=[('flower', ('#ff7aa8', '#ffffff', '#ffd84a', '#9a7aff')), ('tuft', '#5aa04a')]),
    'ch2': dict(name='Thornwood', g=('#3f6b3a', '#335c32'), clearing='#4f7a45', world=('#9fb4c9', 0.6), sun=('#e6f0d6', 2.4),
                big=[('tree_pine', '#2a5a35', 0.55), ('tree_pine', '#1f4a2c', 0.2), ('bush', '#2f5a30', 0.15), ('log', None, 0.1)],
                small=[('mushroom', '#d94a3d'), ('tuft', '#2f5a30')]),
    'ch3': dict(name='Ashen Steppe', g=('#9a8a78', '#857565'), clearing='#a89886', world=('#d9b8a0', 0.7), sun=('#ffb27a', 3.0),
                big=[('tree_dead', '#4a3a32', 0.35), ('rock', '#5f5652', 0.45), ('rock', '#7a6e66', 0.2)],
                small=[('ember', None), ('tuft', '#8a7a5a')]),
    'ch4': dict(name='Frostpeak', g=('#eef4fa', '#d6e2ee'), clearing='#f8fbff', world=('#cfe0ff', 0.9), sun=('#e8f0ff', 2.8),
                big=[('tree_pine_snow', '#2f5a4a', 0.5), ('rock_snow', '#8a96a8', 0.3), ('crystal', '#8fe3ff', 0.2)],
                small=[('tuft', '#b8c8d8')]),
    'ch5': dict(name='Sunken Ruins', g=('#d8c48f', '#c7b17c'), clearing='#e2d2a2', world=('#bfe6e6', 0.8), sun=('#fff1d6', 3.0),
                big=[('pillar', '#c9bfa8', 0.45), ('coral', '#ff7a9a', 0.2), ('rock', '#8fa39a', 0.15), ('puddle', '#2aa6a0', 0.2)],
                small=[('tuft', '#5aa08a')]),
    'ch6': dict(name='The Hollow Dark', g=('#3a2f4f', '#2f2642'), clearing='#463a5e', world=('#3a2f5c', 0.35), sun=('#b8a0ff', 1.0),
                big=[('crystal', '#b48cff', 0.35), ('tree_dead', '#241c33', 0.3), ('mushroom_glow', '#4dffd2', 0.2), ('rock', '#2a2238', 0.15)],
                small=[('mushroom_small', '#4dffd2'), ('tuft', '#4a3a66')]),
}


def place_big(kind, c, x, y, k):
    if kind == 'tree_round':
        tree_round(x, y, k, c)
    elif kind == 'tree_pine':
        tree_pine(x, y, k, c)
    elif kind == 'tree_pine_snow':
        tree_pine(x, y, k, c, snow=True)
    elif kind == 'tree_dead':
        tree_dead(x, y, k, c)
    elif kind == 'rock':
        rock(x, y, k * 0.9, c)
    elif kind == 'rock_snow':
        rock(x, y, k * 0.9, c, snow=True)
    elif kind == 'bush':
        bush(x, y, k * 0.9, c)
    elif kind == 'log':
        log(x, y, k)
    elif kind == 'crystal':
        crystal(x, y, k * 0.9, c)
    elif kind == 'mushroom_glow':
        mushroom(x, y, k * 2.2, c, glow_s=2)
    elif kind == 'pillar':
        pillar(x, y, k, c)
    elif kind == 'coral':
        coral(x, y, k * 1.3, c)
    elif kind == 'puddle':
        disc(x, y, 1.1 * k, c, rough=0.05, sx=1.4)


def pick(weighted):
    t = R.random() * sum(w for *_, w in weighted)
    for item in weighted:
        t -= item[-1]
        if t <= 0:
            return item
    return weighted[-1]


def battle(key):
    ch = CHAPTERS[key]
    R.seed(int(key[2:]) * 101)
    reset(transparent=False, samples=64)
    world_color(ch['world'][0], ch['world'][1] * 0.7)
    ground(*ch['g'])
    disc(0, 0, 4.0, ch['clearing'], sx=0.95, sy=1.95)  # the arena clearing where units stand
    disc(0, 0, 3.75, ch['g'][0], sx=0.95, sy=1.95, z=0.015)
    disc(0, 0, 3.5, ch['clearing'], sx=0.95, sy=1.95, z=0.02)
    # big props around the edges, never in the middle where units fight
    spots = []
    for _ in range(400):
        x, y = R.uniform(-7, 7), R.uniform(-12, 12)
        if x * x / 4.3 ** 2 + y * y / 8.4 ** 2 < 1:
            continue
        if any((x - a) ** 2 + (y - b) ** 2 < 2.2 ** 2 for a, b in spots):
            continue
        spots.append((x, y))
        if len(spots) >= 34:
            break
    for x, y in spots:
        kind, c, _ = pick(ch['big'])
        place_big(kind, c, x, y, R.uniform(0.8, 1.25))
    # small details everywhere except inside the clearing
    for _ in range(90):
        x, y = R.uniform(-6, 6), R.uniform(-11, 11)
        if x * x / 3.9 ** 2 + y * y / 7.9 ** 2 < 1:
            continue
        kind, c = R.choice(ch['small'])
        if kind == 'flower':
            flower(x, y, R.choice(c))
        elif kind == 'tuft':
            tuft(x, y, c)
        elif kind == 'mushroom':
            mushroom(x, y, R.uniform(0.6, 1.0), c)
        elif kind == 'mushroom_small':
            mushroom(x, y, R.uniform(0.6, 1.0), c, glow_s=1.5)
        elif kind == 'ember':
            ember(x, y)
    add_outlines(0.05)
    sun((40, 0, -30), ch['sun'][1] * 0.75, ch['sun'][0], angle=5)
    camera((0, -10, 17.3), (0, 0, 0), ortho=18)
    render(os.path.join(OUT, f'battle_{key}.webp'), 720, 1280, quality=82)


def camp():
    R.seed(7)
    reset(transparent=False, samples=96)
    world_color('#3a2f66', 0.6)
    ground('#4f8a4a', '#43783f')
    disc(0, 0.6, 2.2, '#7a6a52', rough=1)
    # tents
    for x, y, c, rot in ((-3.1, 2.2, '#c0504d', 20), (3.2, 2.6, '#4a7bd1', -25)):
        cyl((x, y, 1.0), 1.6, 2.0, mat(c), r2=0.0, verts=4, rot=(0, 0, 45 + rot))
        cyl((x + 0.35 * math.sin(math.radians(-rot)), y - 0.9, 0.55), 0.55, 1.1, mat('#1f1a2a'), r2=0.0, verts=3,
            rot=(90, 0, rot), scale=(1, 1, 0.12))
    # campfire
    for a in (0, 60, 120):
        cyl((0, 0.6, 0.15), 0.12, 1.3, mat('#6b442a'), rot=(90, 0, a))
    for i in range(8):
        a = math.radians(i * 45)
        rock(0.9 * math.cos(a), 0.6 + 0.9 * math.sin(a), 0.38, '#8a8a92')
    cyl((0, 0.6, 0.55), 0.38, 0.9, glow('#ff7a1a', 12), r2=0.0, verts=12, outline=False)
    cyl((0, 0.6, 0.6), 0.22, 0.75, glow('#ffd84a', 15), r2=0.0, verts=10, outline=False)
    point((0, 0.6, 1.0), 900, '#ff9a4a', 0.3)
    for _ in range(14):
        sphere((R.uniform(-0.5, 0.5), 0.6 + R.uniform(-0.3, 0.3), R.uniform(1.2, 2.6)), 0.03, glow('#ffb04a', 10), outline=False)
    # logs to sit on, a chest and a banner
    log(-1.7, -0.3, 0.8)
    log(1.8, -0.2, 0.8)
    box((2.0, 1.2, 0.3), (0.8, 0.5, 0.55), mat('#8a5a35'), bevel=0.05)
    box((2.0, 0.94, 0.38), (0.15, 0.03, 0.18), mat('#f2c14e', metal=0.9, rough=0.3), outline=False)
    cyl((-1.2, 3.6, 1.5), 0.05, 3.0, mat('#6b442a'))
    box((-0.75, 3.6, 2.6), (0.9, 0.04, 0.6), mat('#8b6cff'))
    # forest backdrop
    for i in range(22):
        x = -12 + i * 1.15 + R.uniform(-0.3, 0.3)
        y = R.uniform(5.5, 9)
        tree_pine(x, y, R.uniform(1.2, 1.9), R.choice(('#2a5a35', '#24503a', '#2f6a3a')))
    for i in range(10):
        tree_round(R.choice((-1, 1)) * R.uniform(5, 9), R.uniform(1, 4), R.uniform(0.9, 1.3), '#3f8a45')
    for _ in range(40):
        x, y = R.uniform(-8, 8), R.uniform(-3, 4)
        if x * x + (y - 0.6) ** 2 > 6:
            tuft(x, y, '#3f7a3a')
    for _ in range(40):
        sphere((R.uniform(-14, 14), 30, R.uniform(4, 12)), R.uniform(0.03, 0.07), glow('#ffffff', 6), outline=False)
    add_outlines(0.04)
    sun((60, 0, 150), 0.8, '#9fb4ff', angle=5)
    camera((0, -9.5, 3.2), (0, 1.0, 1.0), lens=32)
    render(os.path.join(OUT, 'camp.webp'), 1024, 512, quality=85)


# ---------------- side-view arenas (Swords & Sandals style) ----------------
ARENAS = {
    'ch1': dict(crowd='#b8ad98', g=('#86c766', '#6bb156'), strip=('#d6bf8e', '#c4a978'), wall='fence', wallc='#8a5a35',
                mid=[('tree_round', '#4fa64a', 0.6), ('bush', '#4f9a45', 0.25), ('rock', '#a3a7ad', 0.15)],
                far='hills', farc='#79ad66', sky=('#5fb4ff', '#e6f6ff'), sun=('#fff1d6', 3.0), banner='#d94a3d'),
    'ch2': dict(g=('#3f6b3a', '#335c32'), strip=('#7a6448', '#6b583e'), wall='fence', wallc='#5a3d26',
                mid=[('tree_pine', '#2a5a35', 0.7), ('mushroom', '#d94a3d', 0.15), ('bush', '#2f5a30', 0.15)],
                far='pines', farc='#30503d', sky=('#3f5f73', '#b8d0c0'), sun=('#e6f0d6', 2.2), banner='#4fa64a'),
    'ch3': dict(crowd='#5f5652', g=('#8a7a68', '#776858'), strip=('#b8a088', '#a89078'), wall='stone', wallc='#6b625a',
                mid=[('tree_dead', '#3a2e28', 0.5), ('rock', '#5f5652', 0.5)],
                far='volcano', farc='#5a4a44', sky=('#4a2a30', '#ffae6a'), sun=('#ffb27a', 3.0), banner='#ff8a2a'),
    'ch4': dict(crowd='#c8d8e8', g=('#eef4fa', '#d6e2ee'), strip=('#dce8f4', '#cbdbea'), wall='ice', wallc='#a8d8f0',
                mid=[('tree_pine_snow', '#2f5a4a', 0.6), ('rock_snow', '#8a96a8', 0.25), ('crystal', '#8fe3ff', 0.15)],
                far='mountains', farc='#8a9ab0', sky=('#5a8ad0', '#eaf4ff'), sun=('#e8f0ff', 2.8), banner='#3a6fd1'),
    'ch5': dict(crowd='#d8ccb0', g=('#d8c48f', '#c7b17c'), strip=('#e8d8a8', '#dccb98'), wall='stone', wallc='#c9bfa8',
                mid=[('pillar', '#c9bfa8', 0.6), ('coral', '#ff7a9a', 0.2), ('rock', '#8fa39a', 0.2)],
                far='dunes', farc='#d4bd86', sky=('#3aa0d0', '#fff0c8'), sun=('#fff1d6', 3.0), banner='#2aa6a0'),
    'ch6': dict(g=('#3a2f4f', '#2f2642'), strip=('#4c4066', '#433858'), wall='crystal', wallc='#b48cff',
                mid=[('crystal', '#b48cff', 0.4), ('tree_dead', '#241c33', 0.35), ('mushroom_glow', '#4dffd2', 0.25)],
                far='spires', farc='#2a2238', sky=('#0c0816', '#3a2a5c'), sun=('#b8a0ff', 1.0), banner='#b48cff'),
}


def sky(top, horizon):
    """A huge vertical backdrop with a vertical colour gradient (emissive, so lighting doesn't touch it)."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 140, 60))
    o = bpy.context.object
    o.scale = (900, 260, 1)
    o.rotation_euler[0] = math.radians(90)
    o['outline'] = False
    m = bpy.data.materials.new('sky')
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.42
    ramp.color_ramp.elements[0].color = (*hx(horizon), 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (*hx(top), 1)
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Y'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m)


def barrier(kind, c, banner):
    """The low arena wall behind the fighters, with two banners."""
    y = 7.0
    if kind == 'fence':
        for i in range(-12, 13):
            cyl((i * 1.5, y, 0.7), 0.12, 1.4, mat(c), verts=8)
        for z in (0.55, 1.15):
            box((0, y - 0.1, z), (37, 0.12, 0.16), mat(c))
    elif kind == 'stone':
        for i in range(-10, 11):
            box((i * 1.85, y, 0.75), (1.75, 0.8, 1.5), mat(c), bevel=0.08)
            box((i * 1.85, y, 1.62), (1.0, 0.8, 0.3), mat(c), bevel=0.05)
    elif kind == 'ice':
        for i in range(-10, 11):
            box((i * 1.85, y, 0.7), (1.7, 0.9, 1.4 + (i % 3) * 0.25), mat(c, rough=0.15), bevel=0.12)
    elif kind == 'crystal':
        for i in range(-14, 15):
            cyl((i * 1.3, y + (i % 2) * 0.5, 0.9), 0.35, 1.8 + (i % 3) * 0.6, mat(c, emit=1.2, rough=0.2), r2=0.0, verts=5)
        point((0, y - 1, 2), 300, c, 2)
    for x in (-5.5, 5.5):
        cyl((x, y - 0.6, 2.0), 0.07, 4.0, mat('#6b442a'), verts=8)
        box((x + (0.55 if x < 0 else -0.55), y - 0.6, 3.3), (1.0, 0.05, 1.3), mat(banner))
        cyl((x, y - 0.6, 4.08), 0.12, 0.2, gold_mat(), r2=0.0, verts=8)


def gold_mat():
    return mat('#f2c14e', rough=0.3, metal=0.9)


def stands(c):
    """Tiered stone stands behind the wall, packed with a cheering crowd."""
    shirts = ['#d94a3d', '#3f6fd1', '#f2c14e', '#4fa64a', '#a57fd9', '#f2903a', '#e8e2cf', '#2aa6a0']
    skins = ['#ffd9bd', '#e8b48a', '#c08a5a', '#8a5a35', '#f0c7a0']
    for tier in range(4):
        y, z = 8.6 + tier * 1.3, 0.5 + tier * 0.75
        box((0, y, z / 2), (44, 1.3, z + 0.5), mat(c, rough=0.9), bevel=0.04)
        for i in range(-21, 22):
            if R.random() < 0.18:
                continue
            x = i + R.uniform(-0.25, 0.25)
            cyl((x, y - 0.2, z + 0.75), 0.24, 0.6, mat(R.choice(shirts)), verts=8)
            sphere((x, y - 0.2, z + 1.22), 0.2, mat(R.choice(skins)), seg=10, rings=6)
            if R.random() < 0.3:  # cheering arm
                tube([(x + 0.2, y - 0.2, z + 0.95), (x + 0.32, y - 0.25, z + 1.35)], [0.06, 0.05], mat(R.choice(skins)))


def clouds(dark=False):
    for _ in range(9 if not dark else 0):
        x, z = R.uniform(-70, 70), R.uniform(28, 70)
        for k in range(4):
            sphere((x + k * 4 + R.uniform(-1, 1), 110, z + R.uniform(-1.5, 1.5)), R.uniform(3, 5.5), mat('#ffffff', emit=0.9),
                   scale=(1.3, 0.5, 0.7), outline=False, seg=14, rings=8)
    if dark:
        for _ in range(120):
            sphere((R.uniform(-90, 90), 120, R.uniform(15, 95)), R.uniform(0.15, 0.35), mat('#ffffff', emit=8), outline=False, seg=6, rings=4)


def far_layer(kind, c):
    R.seed(99)
    for i in range(14):
        x = -90 + i * 14 + R.uniform(-4, 4)
        y = R.uniform(55, 80)
        if kind == 'hills':
            sphere((x, y, -4), R.uniform(10, 16), mat(c, rough=1), scale=(1.6, 1, 0.6), outline=False)
        elif kind == 'dunes':
            sphere((x, y, -5), R.uniform(12, 18), mat(c, rough=1), scale=(2.0, 1, 0.45), outline=False)
        elif kind == 'pines':
            for k in range(3):
                cyl((x + k * 4, y - k * 6, 6), 3.0, 14, mat(c), r2=0.0, verts=8, outline=False)
        elif kind in ('mountains', 'volcano', 'spires'):
            h = R.uniform(18, 30) if kind != 'spires' else R.uniform(14, 34)
            r = h * (0.9 if kind != 'spires' else 0.3)
            cyl((x, y, h / 2 - 2), r, h, mat(c, rough=1), r2=0.0 if kind != 'volcano' else r * 0.18, verts=7, outline=False)
            if kind == 'mountains':
                cyl((x, y, h - 2 - h * 0.15), r * 0.32, h * 0.3, mat('#f4f8ff'), r2=0.0, verts=7, outline=False)
            if kind == 'volcano' and i % 3 == 0:
                sphere((x, y, h - 2), r * 0.2, mat('#ff6a1a', emit=6), scale=(1, 1, 0.3), outline=False)


def arena(key):
    ch = ARENAS[key]
    R.seed(int(key[2:]) * 31)
    reset(transparent=False, samples=64)
    world_color(ch['sky'][1], 0.55)
    sky(*ch['sky'])
    ground(*ch['g'], size=(400, 400), loc=(0, 150, 0), scale_noise=0.08)
    ground(*ch['strip'], size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)  # the arena floor fighters stand on
    barrier(ch['wall'], ch['wallc'], ch['banner'])
    if ch.get('crowd'):
        stands(ch['crowd'])
    clouds(dark=key == 'ch6')
    far_layer(ch['far'], ch['farc'])
    # scenery behind the wall
    for _ in range(26):
        kind, c, _w = pick(ch['mid'])
        place_big(kind, c, R.uniform(-24, 24), R.uniform(15 if ch.get('crowd') else 10, 30), R.uniform(1.5, 2.6))
    # a few foreground details at the edges of the frame
    for _ in range(18):
        x = R.choice((-1, 1)) * R.uniform(2.6, 6)
        y = R.uniform(-5, -3)
        (tuft if R.random() < 0.7 else (lambda a, b, c: rock(a, b, 0.5, '#7a7470')))(x, y, ch['g'][1])
    add_outlines(0.05)
    sun((55, 0, -35), ch['sun'][1], ch['sun'][0], angle=5)
    camera((0, -13, 2.4), (0, 10, 1.9), lens=28)
    render(os.path.join(OUT, f'battle_{key}.webp'), 720, 1280, quality=82)


# ---------------- hunting-ground scenes (no arena: each matches its area's name) ----------------
def tombstone(x, y, k, c):
    box((x, y, 0.55 * k), (0.7 * k, 0.22 * k, 1.1 * k), mat(c, rough=0.9), rot=(R.uniform(-8, 8), 0, R.uniform(-10, 10)), bevel=0.05)
    cyl((x, y, 1.1 * k), 0.35 * k, 0.22 * k, mat(c, rough=0.9), rot=(90, 0, 0), verts=16)


def cross(x, y, k, c):
    box((x, y, 0.8 * k), (0.16 * k, 0.16 * k, 1.6 * k), mat(c))
    box((x, y, 1.15 * k), (0.8 * k, 0.16 * k, 0.16 * k), mat(c))


def stalactite(x, y, z, k, c):
    cyl((x, y, z - 0.9 * k), 0.4 * k, 1.8 * k, mat(c, rough=0.4), r2=0.0, verts=6, rot=(180, 0, 0))


def seaweed(x, y, k):
    tube([(x, y, 0), (x + 0.2 * k, y, 0.8 * k), (x - 0.15 * k, y, 1.6 * k), (x + 0.1 * k, y, 2.3 * k)],
         [0.12 * k, 0.1 * k, 0.07 * k, 0.02 * k], mat('#3f9a5a'))


def lava_pool(x, y, r):
    disc(x, y, r, '#ff6a1a', emit=6, sx=1.6)
    point((x, y, 0.8), 400, '#ff7a2a', 1.0)


def hunt_scene(key):
    R.seed(hash(key) % 997 if False else sum(map(ord, key)))
    reset(transparent=False, samples=64)
    cam = ((0, -13, 2.4), (0, 10, 1.9))
    if key == 'meadow':
        world_color('#e6f6ff', 0.6); sky('#5fb4ff', '#e6f6ff'); clouds()
        ground('#8fd16a', '#74bd58', size=(400, 400), loc=(0, 150, 0), scale_noise=0.08)
        ground('#9fd77a', '#86c766', size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)
        far_layer('hills', '#79ad66')
        for i in range(-10, 11):  # a low farm fence far behind
            cyl((i * 2.2, 22, 0.6), 0.1, 1.2, mat('#8a5a35'), verts=8)
        box((0, 22, 0.8), (46, 0.1, 0.12), mat('#8a5a35'))
        for _ in range(16):
            place_big(R.choice(['tree_round', 'bush']), R.choice(['#4fa64a', '#6cbf4a']), R.uniform(-26, 26), R.uniform(8, 30), R.uniform(1.4, 2.4))
        for _ in range(140):
            x, y = R.uniform(-9, 9), R.uniform(-5, 6)
            if abs(y + 1) > 1.6 or abs(x) > 5:
                flower(x, y, R.choice(('#ff7aa8', '#ffffff', '#ffd84a', '#9a7aff')))
        sunc = ('#fff1d6', 3.0)
    elif key == 'thorn':
        world_color('#9fb4a0', 0.35); sky('#2f4a40', '#8fb0a0')
        ground('#3a5f36', '#2f5230', size=(400, 400), loc=(0, 150, 0), scale_noise=0.1)
        ground('#5a4a36', '#4c3e2c', size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)
        far_layer('pines', '#1f3a2c')
        for _ in range(40):
            place_big('tree_pine', R.choice(['#1f4a2c', '#2a5a35']), R.uniform(-24, 24), R.uniform(6, 30), R.uniform(1.6, 2.8))
        for _ in range(14):  # thorny brambles
            x, y = R.uniform(-10, 10), R.uniform(3, 7)
            for k in range(6):
                a = R.uniform(0, 6.28)
                tube([(x, y, 0.1), (x + math.cos(a) * 0.8, y + math.sin(a) * 0.4, 0.7), (x + math.cos(a) * 1.4, y + math.sin(a) * 0.6, 0.4)],
                     [0.06, 0.04, 0.01], mat('#3a2a1f'))
        for _ in range(10):
            mushroom(R.choice((-1, 1)) * R.uniform(3, 7), R.uniform(-4, 2), R.uniform(0.8, 1.4), '#d94a3d')
        for x in (-7.5, 7.5):  # big trunks framing the shot
            cyl((x, -2, 6), 0.9, 12, mat('#4a3424'), verts=12)
        sunc = ('#d8f0c8', 1.6)
    elif key == 'grave':
        world_color('#6a5a8a', 0.4); sky('#2a1f45', '#d9846a')
        sphere((-8, 120, 38), 7, mat('#fff4d6', emit=4), outline=False)  # the moon
        ground('#4a4a3f', '#3f4036', size=(400, 400), loc=(0, 150, 0), scale_noise=0.1)
        ground('#5a5246', '#4c463c', size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)
        far_layer('hills', '#2f2a3a')
        for i in range(-12, 13):  # iron fence
            cyl((i * 1.0, 9, 0.9), 0.05, 1.8, mat('#22202a'), r2=0.02, verts=6)
        box((0, 9, 1.4), (26, 0.06, 0.08), mat('#22202a'))
        for _ in range(36):
            x, y = R.uniform(-16, 16), R.uniform(4, 22)
            (tombstone if R.random() < 0.7 else cross)(x, y, R.uniform(0.9, 1.4), R.choice(('#8a8a92', '#9a958a', '#6f6f78')))
        for _ in range(6):
            tree_dead(R.uniform(-20, 20), R.uniform(10, 26), R.uniform(1.6, 2.6), '#2a2230')
        for _ in range(10):  # low mist
            sphere((R.uniform(-14, 14), R.uniform(2, 16), 0.3), R.uniform(2, 4), mat('#c8c0e0', emit=0.25, alpha=0.25),
                   scale=(2.5, 1, 0.25), outline=False)
        sunc = ('#ffb88a', 1.4)
    elif key == 'peaks':  # an ice cave
        world_color('#4a6a9a', 0.35)
        ground('#c8dcef', '#b0c8e0', size=(400, 400), loc=(0, 150, 0), scale_noise=0.1)
        ground('#dce8f4', '#cbdbea', size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)
        box((0, 30, 12), (90, 2, 30), mat('#3a4f78', rough=0.6), outline=False)         # back wall
        box((0, 10, 13.5), (90, 50, 1), mat('#2f4068', rough=0.6), outline=False)        # ceiling
        for _ in range(26):
            stalactite(R.uniform(-18, 18), R.uniform(2, 26), 13, R.uniform(1, 2.4), R.choice(('#bfe6ff', '#9fcfee')))
        for _ in range(30):
            rock(R.uniform(-20, 20), R.uniform(6, 28), R.uniform(1.5, 3.5), R.choice(('#4a5f88', '#5a72a0')), snow=R.random() < 0.4)
        for _ in range(12):
            crystal(R.uniform(-14, 14), R.uniform(4, 20), R.uniform(1, 1.8), '#8fe3ff')
        sunc = ('#c8e0ff', 0.6)
        cam = ((0, -13, 2.4), (0, 10, 2.6))
    elif key == 'depths':  # underwater sunken ruins
        world_color('#2a8a9a', 0.5); sky('#06324a', '#2aa6b0')
        ground('#c9b98a', '#b8a878', size=(400, 400), loc=(0, 150, 0), scale_noise=0.1)
        ground('#d8c89a', '#cbb98a', size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)
        far_layer('dunes', '#3f8a8a')
        for _ in range(14):
            pillar(R.uniform(-20, 20), R.uniform(6, 26), R.uniform(1.2, 2.2), '#a8b8a8')
        for _ in range(16):
            coral(R.uniform(-14, 14), R.uniform(3, 18), R.uniform(1.2, 2.2), R.choice(('#ff7a9a', '#ffb04a', '#b48cff')))
        for _ in range(22):
            seaweed(R.choice((-1, 1)) * R.uniform(3, 14), R.uniform(-3, 16), R.uniform(1, 2))
        for _ in range(60):  # bubbles
            sphere((R.uniform(-12, 12), R.uniform(-2, 20), R.uniform(1, 14)), R.uniform(0.06, 0.2), mat('#e8ffff', emit=1.2), outline=False, seg=8, rings=6)
        for _ in range(5):  # light shafts from the surface
            cyl((R.uniform(-12, 12), R.uniform(8, 24), 9), 1.2, 22, mat('#bff8ff', emit=0.4, alpha=0.12), r2=2.5, verts=12, rot=(0, R.uniform(-15, 15), 0), outline=False)
        sunc = ('#bff8ff', 1.6)
    elif key == 'lairs':  # volcanic boss lair
        world_color('#5a1f14', 0.35); sky('#12060a', '#7a2a14')
        ground('#3a2a2a', '#2f2222', size=(400, 400), loc=(0, 150, 0), scale_noise=0.1)
        ground('#4a3a34', '#3f302b', size=(90, 20), loc=(0, -3, 0.02), scale_noise=0.5)
        far_layer('volcano', '#2a1a1a')
        for _ in range(8):
            lava_pool(R.uniform(-14, 14), R.uniform(5, 18), R.uniform(1, 2.2))
        for _ in range(26):
            cyl((R.uniform(-20, 20), R.uniform(6, 28), 1.5), R.uniform(0.5, 1.1), R.uniform(3, 7), mat('#2a1f1f', rough=0.9), r2=0.0, verts=6)
        for _ in range(14):  # bones and skulls
            x, y = R.choice((-1, 1)) * R.uniform(3, 9), R.uniform(-4, 4)
            sphere((x, y, 0.2), 0.22, mat('#e8e0cc'), scale=(1, 1, 0.9))
            cyl((x + 0.5, y, 0.08), 0.05, 0.8, mat('#e8e0cc'), rot=(0, 90, R.uniform(0, 180)))
        for _ in range(40):
            ember(R.uniform(-10, 10), R.uniform(-2, 10))
        sunc = ('#ff8a4a', 1.2)
    add_outlines(0.05)
    sun((55, 0, -35), sunc[1], sunc[0], angle=5)
    camera(*cam, lens=28)
    render(os.path.join(OUT, f'hunt_{key}.webp'), 720, 1280, quality=82)


HUNTS = ['meadow', 'thorn', 'grave', 'peaks', 'depths', 'lairs']


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # battle_chN.webp are the side-view arenas; pass topdown-chN for the old top-down boards.
    jobs = [a for a in sys.argv[1:] if not a.startswith('-')] or ['camp', *ARENAS, *HUNTS]
    for j in jobs:
        if j == 'camp':
            camp()
        elif j in HUNTS:
            hunt_scene(j)
        elif j.startswith('topdown-'):
            battle(j[8:])
        else:
            arena(j)
        print('rendered', j, flush=True)
