"""Smoothing pass for character and monster models (used by sprites.py --smooth).

Keeps every design identical (silhouette, proportions, colours, poses, camera, lighting) and only
makes the shapes smoother and more unified:
  1. clean up every mesh: merge vertices by distance (0.001) and recalculate normals outside;
  2. fuse the body parts of each model into one mesh with a Voxel Remesh sized to the model,
     using a Data Transfer modifier from the original parts to keep each part's exact colour;
  3. Subdivision Surface (viewport 1, render 2), then smooth-by-angle at 30 degrees.
Gear (weapons, armor, accessories), eyes, highlights and glowing parts stay separate objects.
"""
import math
import bpy
import bmesh
from common import outline_mat

VOXEL_FRACTION = 0.006   # voxel size = 0.6% of the model's largest dimension
STEP_SMOOTH = (0.5, 4)   # light Laplacian smooth (factor, repeats) to even out voxel stair-steps (well under 1 px)
AUTO_SMOOTH_DEG = 30
MERGE_DIST = 0.001


def cleanup(o):
    """Step 2: merge vertices by distance and recalculate normals outside."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=MERGE_DIST)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    merged = before - len(bm.verts)
    bm.to_mesh(o.data)
    bm.free()
    return merged


def _principled(m):
    return next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m and m.node_tree else None


def fusable(o):
    """Body parts with a plain painted material (not glowing, metallic, see-through or outline-less)."""
    if o.type != 'MESH' or o.get('part') != 'body' or not o.get('outline', True):
        return False
    b = _principled(o.data.materials[0] if o.data.materials else None)
    if not b:
        return False
    emit = b.inputs['Emission Strength'].default_value
    return emit == 0 and b.inputs['Metallic'].default_value < 0.5 and b.inputs['Alpha'].default_value >= 1


def close_holes(o):
    """Cap open ends (tube tails, tentacles, legs) so the voxel remesh sees a solid shape."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    res = bmesh.ops.holes_fill(bm, edges=bm.edges, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    return len(res['faces'])


def round_out(o, levels=2, keep_sharp_deg=50):
    """Make a smooth-shaded part truly round before the remesh. Low-poly spheres only *look* round
    through smooth shading; the voxel remesh would copy their flat facets. Edges sharper than
    keep_sharp_deg (cylinder rims, cone bases) are creased so they stay crisp."""
    if not any(p.use_smooth for p in o.data.polygons):
        return False   # flat-shaded parts (blocky boxes) keep their exact shape
    bm = bmesh.new()
    bm.from_mesh(o.data)
    crease = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    lim = math.radians(keep_sharp_deg)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
            e[crease] = 1.0
    bm.to_mesh(o.data)
    bm.free()
    sd = o.modifiers.new('round', 'SUBSURF')
    sd.levels = sd.render_levels = levels
    _apply_modifiers(o)
    return True


def _strip_outline(o):
    if 'outline' in o.modifiers:
        o.modifiers.remove(o.modifiers['outline'])
    while len(o.data.materials) > 1 and o.data.materials[-1].name.startswith('outline'):
        o.data.materials.pop()


def _paint(o):
    """Store the part's material colour on its vertices (a 'Col' colour attribute) so it survives the remesh."""
    b = _principled(o.data.materials[0])
    col = tuple(b.inputs['Base Color'].default_value)
    attr = o.data.color_attributes.get('Col') or o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for d in attr.data:
        d.color = col
    return col, b.inputs['Roughness'].default_value


def _apply_modifiers(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def _join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    j = bpy.context.object
    j.name = name
    return j


def _vcol_material(rough):
    m = bpy.data.materials.new('fused_body')
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = _principled(m)
    a = nt.nodes.new('ShaderNodeAttribute')
    a.attribute_name = 'Col'
    nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    return m


def color_layer_group():
    """Adds an empty 'Col' colour layer after the remesh (the remesh drops attributes and the Data
    Transfer modifier only fills layers that already exist)."""
    if 'Add Col Layer' in bpy.data.node_groups:
        return bpy.data.node_groups['Add Col Layer']
    g = bpy.data.node_groups.new('Add Col Layer', 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gi, go = g.nodes.new('NodeGroupInput'), g.nodes.new('NodeGroupOutput')
    st = g.nodes.new('GeometryNodeStoreNamedAttribute')
    st.data_type = 'FLOAT_COLOR'
    st.domain = 'CORNER'
    st.inputs['Name'].default_value = 'Col'
    g.links.new(gi.outputs[0], st.inputs['Geometry'])
    g.links.new(st.outputs[0], go.inputs[0])
    return g


def smooth_by_angle_group():
    """Geometry-nodes 'Smooth by Angle': smooth everywhere except edges sharper than 30 degrees."""
    if 'Smooth by Angle 30' in bpy.data.node_groups:   # scenes are reset between renders: look it up by name
        return bpy.data.node_groups['Smooth by Angle 30']
    g = bpy.data.node_groups.new('Smooth by Angle 30', 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    n = g.nodes
    gi, go = n.new('NodeGroupInput'), n.new('NodeGroupOutput')
    faces = n.new('GeometryNodeSetShadeSmooth')
    faces.domain = 'FACE'
    edges = n.new('GeometryNodeSetShadeSmooth')
    edges.domain = 'EDGE'
    angle = n.new('GeometryNodeInputMeshEdgeAngle')
    cmp = n.new('FunctionNodeCompare')
    cmp.data_type = 'FLOAT'
    cmp.operation = 'LESS_EQUAL'
    cmp.inputs['B'].default_value = math.radians(AUTO_SMOOTH_DEG)
    g.links.new(gi.outputs[0], faces.inputs['Geometry'])
    g.links.new(faces.outputs[0], edges.inputs['Geometry'])
    g.links.new(angle.outputs['Unsigned Angle'], cmp.inputs['A'])
    g.links.new(cmp.outputs[0], edges.inputs['Shade Smooth'])  # edges up to 30 degrees smooth, sharper ones stay sharp
    g.links.new(edges.outputs[0], go.inputs[0])
    return g


def smooth_scene(model_name):
    """Run every step on the current scene. Returns a per-object report."""
    report = []
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    merged = {o.name: cleanup(o) for o in meshes}
    parts = [o for o in meshes if fusable(o)]
    for o in meshes:
        if o not in parts:
            report.append(f"{o.name}: kept separate ({'gear' if o.get('part') == 'gear' else 'detail: eye/glow/metal/highlight'}); "
                          f"cleaned (merged {merged[o.name]} verts, normals recalculated)")
    if len(parts) < 1:
        return report
    roughs, capped, rounded = [], 0, 0
    for o in parts:
        _strip_outline(o)
        _apply_modifiers(o)        # e.g. bevels on blocky parts
        capped += close_holes(o)   # open tube ends would vanish in the voxel remesh
        rounded += round_out(o)    # true curves instead of the low-poly facets smooth shading hid
        roughs.append(_paint(o)[1])
    names = [p.name for p in parts]
    # The original parts, joined and hidden, are the Data Transfer source for colours.
    src_parts = []
    for o in parts:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.collection.objects.link(c)
        src_parts.append(c)
    src = _join(src_parts, f'{model_name}_body_source')
    src.hide_render = True
    src.hide_set(True)
    src['outline'] = False
    body = _join(parts, f'{model_name}_body')
    size = max(body.dimensions)
    voxel = round(size * VOXEL_FRACTION, 5)
    body.data.materials.clear()
    body.data.materials.append(_vcol_material(sum(roughs) / len(roughs)))
    rm = body.modifiers.new('Voxel Remesh', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = voxel
    rm.use_smooth_shade = True
    sm = body.modifiers.new('Smooth voxel steps', 'SMOOTH')
    sm.factor, sm.iterations = STEP_SMOOTH
    cl = body.modifiers.new('Colour layer', 'NODES')
    cl.node_group = color_layer_group()
    dt = body.modifiers.new('Data Transfer (colours)', 'DATA_TRANSFER')
    dt.object = src
    dt.use_loop_data = True
    dt.data_types_loops = {'COLOR_CORNER'}
    dt.loop_mapping = 'POLYINTERP_NEAREST'
    sd = body.modifiers.new('Subdivision', 'SUBSURF')
    sd.levels, sd.render_levels = 1, 2
    gn = body.modifiers.new('Smooth by Angle', 'NODES')
    gn.node_group = smooth_by_angle_group()
    body['outline'] = True
    body['part'] = 'body'
    report.insert(0, f"{body.name}: fused {len(names)} body parts ({', '.join(names)}); cleaned (merged {sum(merged[n] for n in names)} verts, "
                     f"normals recalculated); {capped} open ends capped; {rounded} curved parts rounded (subdiv 2, edges >50° creased); Voxel Remesh {voxel} ({VOXEL_FRACTION * 100:.2f}% of {size:.2f}); Smooth {STEP_SMOOTH[0]}x{STEP_SMOOTH[1]}; Data Transfer colours from {src.name}; "
                     f"Subdivision 1/2; Smooth by Angle 30°")
    return report
