"""Original Aki Studio marketing scene. Blender 5.2; no third-party models.
Run from the render project: blender -b --python blender_scene.py -- --preview
App textures are clean marketing captures. No application code is required.
"""
import bpy, math, sys, argparse, json
from pathlib import Path
from mathutils import Vector

args=argparse.ArgumentParser()
args.add_argument('--preview',action='store_true')
args.add_argument('--frame',type=int,default=110)
args.add_argument('--size',type=int,default=1280)
args.add_argument('--start',type=int,default=0)
args.add_argument('--end',type=int,default=479)
args.add_argument('--audit',action='store_true')
args.add_argument('--samples',default='')
args.add_argument('--engine',choices=['CYCLES','BLENDER_EEVEE'],default='BLENDER_EEVEE')
cfg=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'public'/'textures'
OUT=ROOT/'public'/'frames-v2';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine=cfg.engine
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.cycles.max_bounces=5
scene.cycles.diffuse_bounces=2
scene.cycles.glossy_bounces=3
scene.render.resolution_x=cfg.size;scene.render.resolution_y=cfg.size;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.render.fps=60
scene.world.color=(.075,.075,.075)

def material(name,color,metal=0,rough=.25):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m

def image_material(name,file):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear()
    output=n.new('ShaderNodeOutputMaterial');emission=n.new('ShaderNodeEmission');texture=n.new('ShaderNodeTexImage')
    texture.image=bpy.data.images.load(str(ASSETS/file));texture.interpolation='Linear'
    m.node_tree.links.new(texture.outputs['Color'],emission.inputs['Color'])
    m.node_tree.links.new(emission.outputs[0],output.inputs['Surface']);return m

def visibility_material(m):
    m.surface_render_method='BLENDED'
    nodes=m.node_tree.nodes;links=m.node_tree.links
    output=nodes.get('Material Output') or next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
    shader=output.inputs['Surface'].links[0].from_socket
    mix=nodes.new('ShaderNodeMixShader');mix.name='Presentation visibility'
    transparent=nodes.new('ShaderNodeBsdfTransparent')
    links.new(transparent.outputs[0],mix.inputs[1]);links.new(shader,mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
    mix.inputs[0].default_value=1
    return mix.inputs[0]

black=material('Graphite ceramic',(.009,.011,.013),.55,.22)
edge=material('Soft silver graphite edge',(.16,.18,.20),.88,.16)
glass=material('Smoked glass edge',(.029,.034,.04),.55,.17)

def outline(w,h,r,z):
    result=[]
    for cx,cy,start in [(w/2-r,-h/2+r,-math.pi/2),(w/2-r,h/2-r,0),(-w/2+r,h/2-r,math.pi/2),(-w/2+r,-h/2+r,math.pi)]:
        for i in range(13):
            a=start+i*math.pi/24;result.append((cx+math.cos(a)*r,cy+math.sin(a)*r,z))
    return result

def rounded(name,w,h,r,depth,mat,parent=None):
    front=outline(w,h,r,depth/2);back=outline(w,h,r,-depth/2);N=len(front)
    vertices=front+back
    faces=[tuple(range(N)),tuple(range(2*N-1,N-1,-1))]
    faces.extend((i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat);obj.parent=parent
    bevel=obj.modifiers.new('Fine machined edge','BEVEL');bevel.width=.005;bevel.segments=3
    obj.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
    return obj

def picture(name,w,h,r,z,mat,parent):
    vertices=[(0,0,z)]+outline(w,h,r,z);N=len(vertices)-1
    faces=[(0,i+1,(i+1)%N+1) for i in range(N)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Photo UV')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=vertices[mesh.loops[li].vertex_index];uv.data[li].uv=(v[0]/w+.5,v[1]/h+.5)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat);obj.parent=parent;return obj

def group(name):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);return obj

phone=group('Original unbranded handset')
rounded('Phone body',2.40,5.20,.32,.18,black,phone)
rim=rounded('Fine graphite side rail',2.398,5.198,.319,.145,edge,phone)
front=rounded('Continuous thin black bezel',2.382,5.182,.311,.012,black,phone);front.location.z=.085
screen_mat=bpy.data.materials.new('Single composited opaque app screen');screen_mat.use_nodes=True
nodes=screen_mat.node_tree.nodes;nodes.clear();links=screen_mat.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission')
links.new(emission.outputs[0],output.inputs['Surface'])
screen_weights=[];result=None
for key in ['base','looks','curves','color','tools']:
    texture=nodes.new('ShaderNodeTexImage');texture.image=bpy.data.images.load(str(ASSETS/('screen-'+key+'.png')))
    weight=nodes.new('ShaderNodeValue');weight.outputs[0].default_value=1 if key=='base' else 0
    multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
    links.new(texture.outputs['Color'],multiply.inputs[1]);links.new(weight.outputs[0],multiply.inputs[2]);screen_weights.append(weight.outputs[0])
    if result is None:result=multiply.outputs[0]
    else:
        add=nodes.new('ShaderNodeMixRGB');add.blend_type='ADD';add.inputs[0].default_value=1
        links.new(result,add.inputs[1]);links.new(multiply.outputs[0],add.inputs[2]);result=add.outputs[0]
links.new(result,emission.inputs['Color'])
picture('Actual app screen',2.354,5.154,.297,.093,screen_mat,phone)

panels=[]
panel_visibility=[]
source_visibility=[]
layout=json.loads((ASSETS/'panel-layout.json').read_text())
for label,filename,ratio in [('Adaptive Looks','looks-panel.png',472/836),('Curves','curves-panel.png',754/836),('Color Mixer','color-panel.png',.65),('Your tools','tools-panel.png',558/784)]:
    image=bpy.data.images.load(str(ASSETS/filename),check_existing=True);ratio=image.size[1]/image.size[0]
    parent=group(label);w=3.48;h=w*ratio
    # The capture already owns its single perimeter. The backing matches it
    # exactly and never creates a second front-facing frame.
    radius=w*(26/418 if label!='Your tools' else 26/392)
    backing=glass.copy();backing.name=label+' smoked glass thickness'
    surface=image_material(label+' capture',filename)
    rounded(label+' thin glass backing',w,h,radius,.018,backing,parent)
    picture(label+' real interface',w,h,radius,.010,surface,parent)
    panel_visibility.append([visibility_material(backing),visibility_material(surface)])
    panels.append(parent)

def light(name,position,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
light('Large softbox',(-4,5,7),550,5,(.92,.96,1))
light('Long edge light',(5,2,3),400,4,(.94,1,.97))
light('Top rim',(0,6,-2),700,3,(1,1,1))
camera_data=bpy.data.cameras.new('Portrait product camera');camera=bpy.data.objects.new('Portrait product camera',camera_data);bpy.context.collection.objects.link(camera);scene.camera=camera
camera_data.type='PERSP';camera_data.lens=52

def smooth(v):
    # Quintic smootherstep: position, velocity and acceleration are continuous
    # at every endpoint, including when the scroll reverses.
    t=max(0,min(1,v));return t*t*t*(t*(t*6-15)+10)

def pose(obj,pos,rot,scale=1):
    obj.location=pos;obj.rotation_euler=rot;obj.scale=(scale,)*3

def at_frame(frame):
    p=frame/479;stage=smooth((p-.025)/.13)
    pose(phone,(-.80*stage,.36*stage,-.26*stage),(.025,-.22+.07*stage,-.025+.025*stage),1-.13*stage)
    # One panel at a time. Each appears entirely in front of the handset,
    # lifts toward the viewer, moves outward, holds, then reverses its path.
    # There is no depth traversal through the phone and no panel crossover.
    beats=[(.095,.180,.245,.325),(.325,.405,.460,.530),(.530,.610,.665,.735),(.735,.825,1.01,1.10)]
    visible_amounts=[];source_amounts=[]
    for i,obj in enumerate(panels):
        start,arrive,depart,end=beats[i]
        u=min((p-start)/(arrive-start),(end-p)/(end-depart),1)
        amount=smooth(u)
        forward=smooth(u/.65)
        outward=smooth((u-.15)/.85)
        # Clear the source before the detached surface becomes legible. This
        # avoids duplicate labels, including when the visitor reverses scroll.
        visibility=smooth((u-.15)/.25)
        source_amounts.append(1-smooth(u/.15))
        visible_amounts.append(visibility)
        for child in obj.children:child.hide_render=visibility<.0001
        for socket in panel_visibility[i]:socket.default_value=visibility
        pose(obj,(-.62+1.36*outward,-.72+.10*outward,.80+.52*forward),(.005,-.12+.13*amount,0),.54+.40*amount)
    weights=[0,0,0,1]
    previous=3
    for start,current in [(.065,0),(.325,1),(.530,2),(.735,3)]:
        if p<start:break
        transition=(p-start)/.025
        weights=[0,0,0,0];weights[previous]=1-smooth(transition/.45);weights[current]=smooth((transition-.55)/.45)
        previous=current
    amounts=[weights[i]*source_amounts[i] for i in range(4)]
    screen_weights[0].default_value=1-sum(amounts)
    for i,amount in enumerate(amounts):screen_weights[i+1].default_value=amount
    camera.location=(0,.02,12.1)
    camera.rotation_euler=(0,0,0)

def geometry_audit():
    from bpy_extras.object_utils import world_to_camera_view
    def vertices(parent):
        return [obj.matrix_world@Vector(corner) for obj in parent.children for corner in obj.bound_box]
    records=[]
    for frame in range(480):
        at_frame(frame);bpy.context.view_layer.update()
        phone_z=max(v.z for v in vertices(phone))
        visible=[p for p in panels if any(not c.hide_render for c in p.children)]
        assert len(visible)<=1, f'Panel crossover at {frame}'
        clearance=min((min(v.z for v in vertices(p))-phone_z for p in visible),default=None)
        assert clearance is None or clearance>.20, f'Depth intersection at {frame}: {clearance}'
        points=[world_to_camera_view(scene,camera,v) for g in [phone,*visible] for v in vertices(g)]
        assert all(.03<v.x<.97 and .03<v.y<.97 for v in points),f'Frame clipping at {frame}'
        records.append({'frame':frame,'panel':visible[0].name if visible else None,'depth_clearance':clearance})
    payload={'frames':480,'fps':60,'bezel_side_units':.023,'body_width_units':2.40,'min_depth_clearance':min(r['depth_clearance'] for r in records if r['depth_clearance'] is not None),'collision_frames':0,'clipped_frames':0,'maximum_visible_panels':1,'records':records}
    (ROOT/'geometry-audit.json').write_text(json.dumps(payload,indent=2))
    print('AKI_GEOMETRY_AUDIT',payload['min_depth_clearance'])

geometry_audit()

at_frame(cfg.frame)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'aki-studio-scene.blend'))
frames=[] if cfg.audit else [int(x) for x in cfg.samples.split(',')] if cfg.samples else [cfg.frame] if cfg.preview else range(cfg.start,cfg.end+1)
for frame in frames:
    at_frame(frame);scene.render.filepath=str(OUT/f'{frame:04d}.png');bpy.ops.render.render(write_still=True)
print('AKI_RENDER_COMPLETE',len(frames))
