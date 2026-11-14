"""Shared Blender helpers: scene setup, toon materials, primitives, outlines, camera framing.

Run the art scripts with Blender's Python module (pip install bpy) or Blender itself:
    python art/blender/sprites.py      # or: blender -b -P art/blender/sprites.py
"""
import math
import random
import bpy
from mathutils import Vector

ROOT = __file__.rsplit('/art/blender/', 1)[0]
_cache = {}
# Every primitive is tagged with the current part kind: 'body' (anatomy, fused when smoothing)
# or 'gear' (weapons, armor, accessories: kept as separate objects).
PART = {'tag': 'body'}


def hx(h):
    """'#rrggbb' -> linear RGB tuple (Blender colors are scene-linear)."""
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def reset(transparent=True, samples=48):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _cache.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.cycles.filter_width = 1.5  # pixel filter (anti-aliasing) width
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.film_transparent = transparent
    world = bpy.data.worlds.new('World')
    sc.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    return sc


def world_color(color, strength=1.0):
    bg = bpy.context.scene.world.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (*hx(color), 1)
    bg.inputs[1].default_value = strength


def _principled(m):
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m.node_tree.nodes.get('Principled BSDF')


def mat(color, rough=0.6, emit=0.0, metal=0.0, alpha=1.0):
    key = (color, rough, emit, metal, alpha)
    if key in _cache:
        return _cache[key]
    m = bpy.data.materials.new(f'm_{color}')
    b = _principled(m)
    b.inputs['Base Color'].default_value = (*hx(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*hx(color), 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    _cache[key] = m
    return m


def outline_mat():
    if 'outline' in _cache:
        return _cache['outline']
    m = bpy.data.materials.new('outline')
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    mix = nt.nodes.new('ShaderNodeMixShader')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (0.02, 0.012, 0.03, 1)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    lp = nt.nodes.new('ShaderNodeLightPath')
    # Visible only to camera rays, and only on the far side of the shell: lights and shadows ignore it.
    inv = nt.nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1.0
    nt.links.new(lp.outputs['Is Camera Ray'], inv.inputs[1])
    mx = nt.nodes.new('ShaderNodeMath')
    mx.operation = 'MAXIMUM'
    nt.links.new(geo.outputs['Backfacing'], mx.inputs[0])
    nt.links.new(inv.outputs[0], mx.inputs[1])
    nt.links.new(mx.outputs[0], mix.inputs[0])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    _cache['outline'] = m
    return m


# ---------------- primitives ----------------
def _finish(o, m, scale=None, rot=None, smooth=True, outline=True):
    if scale:
        o.scale = scale
    if rot:
        o.rotation_euler = [math.radians(a) for a in rot]
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if o.type == 'MESH':
        o.data.materials.append(m)
        if smooth:
            bpy.ops.object.shade_smooth()
    o['outline'] = outline
    o['part'] = PART['tag']
    return o


def sphere(loc, r, m, scale=None, rot=None, seg=24, rings=14, smooth=True, outline=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=rings)
    return _finish(bpy.context.object, m, scale, rot, smooth, outline)


def ico(loc, r, m, scale=None, rot=None, sub=1, smooth=False, outline=True):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=loc, subdivisions=sub)
    return _finish(bpy.context.object, m, scale, rot, smooth, outline)


def cyl(loc, r, depth, m, rot=None, r2=None, verts=20, scale=None, smooth=True, outline=True):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, vertices=verts)
    return _finish(bpy.context.object, m, scale, rot, smooth, outline)


def box(loc, size, m, rot=None, bevel=0.0, outline=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = _finish(bpy.context.object, m, size, rot, smooth=False, outline=outline)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    return o


def torus(loc, R, r, m, rot=None, scale=None, outline=True):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, major_segments=32, minor_segments=10)
    return _finish(bpy.context.object, m, scale, rot, True, outline)


def tube(points, radii, m, res=4, outline=True):
    """A smooth tapered tube through `points` (tails, tentacles, bows, legs...)."""
    cu = bpy.data.curves.new('tube', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 3
    cu.resolution_u = res
    sp = cu.splines.new('NURBS')
    sp.points.add(len(points) - 1)
    for p, xyz, rr in zip(sp.points, points, radii):
        p.co = (*xyz, 1)
        p.radius = rr
    sp.use_endpoint_u = True
    sp.order_u = min(4, len(points))
    o = bpy.data.objects.new('tube', cu)
    bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    o['outline'] = outline
    o['part'] = PART['tag']
    return o


def add_outlines(thickness=0.035):
    om = outline_mat()
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH' or not o.get('outline', True) or 'outline' in o.modifiers:
            continue
        o.data.materials.append(om)
        mod = o.modifiers.new('outline', 'SOLIDIFY')
        mod.thickness = thickness
        mod.offset = 1
        mod.use_flip_normals = True
        mod.use_rim = False
        mod.material_offset = len(o.data.materials) - 1


# ---------------- lights & camera ----------------
def sun(direction_deg, strength, color='#ffffff', angle=10):
    bpy.ops.object.light_add(type='SUN')
    l = bpy.context.object
    l.rotation_euler = [math.radians(a) for a in direction_deg]
    l.data.energy = strength
    l.data.color = hx(color)
    l.data.angle = math.radians(angle)
    return l


def point(loc, power, color='#ffffff', radius=0.2):
    bpy.ops.object.light_add(type='POINT', location=loc)
    l = bpy.context.object
    l.data.energy = power
    l.data.color = hx(color)
    l.data.shadow_soft_size = radius
    return l


def camera(loc, target, ortho=None, lens=50):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ortho
    else:
        cam.data.lens = lens
    cam.data.clip_end = 500
    bpy.context.scene.camera = cam
    return cam


def frame_ortho(cam, margin=1.1, fixed=None):
    """Fit an orthographic camera tightly around every mesh (keeps sprites the same visual size)."""
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    xs, ys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(dg)
        for v in ev.data.vertices:
            p = inv @ (o.matrix_world @ v.co)
            xs.append(p.x)
            ys.append(p.y)
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    # fixed: keep one zoom level for a family of items so their sizes compare (dagger vs 2H sword)
    cam.data.ortho_scale = fixed or max(max(xs) - min(xs), max(ys) - min(ys)) * margin


def render(path, w, h, fmt='WEBP', quality=90):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = fmt
    if fmt == 'WEBP':
        sc.render.image_settings.quality = quality
        sc.render.image_settings.color_mode = 'RGBA' if sc.render.film_transparent else 'RGB'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
