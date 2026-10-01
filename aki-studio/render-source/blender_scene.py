"""Original Aki Studio marketing scene. Blender 5.2; no third-party models.
Run from the render project: blender -b --python blender_scene.py -- --preview
App textures are clean marketing captures. No application code is required.
"""
import bpy, math, sys, argparse
from pathlib import Path
from mathutils import Vector

args=argparse.ArgumentParser()
args.add_argument('--preview',action='store_true')
args.add_argument('--frame',type=int,default=74)
args.add_argument('--size',type=int,default=1080)
args.add_argument('--start',type=int,default=0)
args.add_argument('--end',type=int,default=191)
args.add_argument('--engine',choices=['CYCLES','BLENDER_EEVEE'],default='BLENDER_EEVEE')
cfg=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'public'/'textures'
OUT=ROOT/'public'/'frames';OUT.mkdir(parents=True,exist_ok=True)
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
scene.render.fps=24
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
    bevel=obj.modifiers.new('Fine machined edge','BEVEL');bevel.width=.012;bevel.segments=3
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
rounded('Phone body',2.46,5.2,.34,.23,black,phone)
rim=rounded('Phone polished edge',2.445,5.185,.33,.10,edge,phone);rim.location.z=.078
front=rounded('Black front bezel',2.405,5.145,.32,.025,black,phone);front.location.z=.14
picture('Actual app screen',2.28,4.96,.26,.158,image_material('App screen','screen.png'),phone)

photo=group('The photograph')
rounded('Photo glass backing',3.21,2.24,.06,.045,glass,photo)
picture('Gumamela photograph',3.17,2.20,.045,.025,image_material('Photograph','photo.png'),photo)

panels=[]
for label,filename,ratio in [('Adaptive Looks','looks-panel.png',472/836),('Curves','curves-panel.png',754/836),('Color Mixer','color-panel.png',.65),('Your tools','tools-panel.png',558/784)]:
    image=bpy.data.images.load(str(ASSETS/filename),check_existing=True);ratio=image.size[1]/image.size[0]
    parent=group(label);w=3.7;h=w*ratio
    rounded(label+' glass edge',w+.045,h+.045,.145,.065,glass,parent)
    picture(label+' real interface',w,h,.12,.034,image_material(label+' capture',filename),parent)
    panels.append(parent)

def light(name,position,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
light('Large softbox',(-4,5,7),550,5,(.92,.96,1))
light('Long edge light',(5,2,3),650,3,(.94,1,.97))
light('Top rim',(0,6,-2),700,3,(1,1,1))
camera_data=bpy.data.cameras.new('Portrait product camera');camera=bpy.data.objects.new('Portrait product camera',camera_data);bpy.context.collection.objects.link(camera);scene.camera=camera
camera_data.type='PERSP';camera_data.lens=52

def smooth(v):
    t=max(0,min(1,v));return t*t*(3-2*t)

def pose(obj,pos,rot,scale=1):
    obj.location=pos;obj.rotation_euler=rot;obj.scale=(scale,)*3

def at_frame(frame):
    p=frame/191;lift=smooth((p-.04)/.17)
    pose(phone,(1.2*lift,.55*lift,-1.1*lift),(.07,-.38+.52*smooth(p/.7),-.075+.11*lift),1-.35*lift)
    pose(photo,(-.82*lift,1.03*lift,.68*lift),(.018,-.14*lift,-.06*lift),.2+.8*lift)
    for child in photo.children:child.hide_render=lift<.002
    # Tool panels float out in a calm, sequential product story.
    centers=[.23,.45,.64,.85]
    for i,obj in enumerate(panels):
        incoming=smooth((p-(centers[i]-.14))/.10)
        outgoing=smooth((p-(centers[i]+.10))/.08) if i<3 else 0
        visible=incoming*(1-outgoing)
        for child in obj.children:child.hide_render=visible<.001
        pose(obj,(.18+.6*(1-incoming)-.8*outgoing,-.55-.15*math.sin(p*math.pi)+.65*(1-incoming)-.4*outgoing,1.4*incoming-1.2*outgoing),(.025,.035+.5*(1-incoming)-.35*outgoing,.018+.10*outgoing),.53+.47*visible)
    camera.location=(.12*math.sin(p*math.pi),.05,12.1-.3*math.sin(p*math.pi))
    # World Y is vertical in this product scene; keep a stable horizon.
    camera.rotation_euler=(0,0,0)

at_frame(cfg.frame)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'aki-studio-scene.blend'))
frames=[cfg.frame] if cfg.preview else range(cfg.start,cfg.end+1)
for frame in frames:
    at_frame(frame);scene.render.filepath=str(OUT/f'{frame:04d}.png');bpy.ops.render.render(write_still=True)
print('AKI_RENDER_COMPLETE',len(frames))
