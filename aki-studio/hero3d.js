// A small, event-driven WebGL product renderer. No framework or model downloads.
// The CSS scene remains present until the first successful textured frame.
export async function mountPhone(stage) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const eligible = () => !motion.matches && !connection?.saveData && (!navigator.hardwareConcurrency || navigator.hardwareConcurrency > 2);
  if (!eligible()) return;

  const canvas = document.createElement('canvas');
  const timeline = stage.closest('.hero-story');
  const phaseTitle = stage.querySelector('.scene-phase b');
  const phaseCopy = stage.querySelector('.scene-phase > span');
  const counter = stage.querySelector('.stage-counter');
  const opening = timeline?.querySelector('.hero-opening');
  const slides = [...(timeline?.querySelectorAll('.story-slide') || [])];
  const mobileCopy = timeline?.querySelector('.mobile-story-copy');
  let lastPhase = -1, lastNarrative = -2, layoutDirty = true, metrics;
  let latestScroll = scrollY;
  canvas.className = 'webgl-phone';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:false, powerPreference:'low-power', preserveDrawingBuffer:false});
  if (!gl) return;
  let active = true, visible = true, frame = 0, dragging = null, ready = false;
  let current = [-.27,.10], target = current.slice(), lastFrame = 0;
  const buffers = [], shaders = [], cleanups = [];
  const on = (object,event,handler,options) => { object.addEventListener(event,handler,options); cleanups.push(() => object.removeEventListener(event,handler,options)); };
  const fallback = () => {
    if (!active) return;
    active = false;cancelAnimationFrame(frame);frame = 0;
    stage.classList.remove('webgl-ready');stage.setAttribute('role','img');stage.setAttribute('aria-label','Aki Studio app preview with Aki’s botanical photography');
    timeline?.classList.remove('story-enabled');
    opening?.classList.remove('story-hidden');if(opening){opening.inert=false;opening.removeAttribute('aria-hidden');}
    slides.forEach(slide=>{slide.hidden=true;});
    stage.removeAttribute('tabindex');stage.removeAttribute('aria-describedby');
    canvas.remove();for (const cleanup of cleanups) cleanup();
  };
  on(canvas,'webglcontextlost',event => {event.preventDefault();fallback();});
  try {
    const vertexSource = `attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV;
      uniform mat4 uModel; uniform mat4 uMVP;
      varying vec3 vPosition; varying vec3 vNormal; varying vec2 vUV;
      void main(){ vec4 world=uModel*vec4(aPosition,1.0); vPosition=world.xyz;
        vNormal=mat3(uModel)*aNormal;vUV=aUV;gl_Position=uMVP*vec4(aPosition,1.0); }`;
    const fragmentSource = `precision mediump float;
      uniform sampler2D uScreen;uniform sampler2D uNextScreen;uniform float uScreenBlend;uniform vec3 uColor;uniform float uTexture;uniform float uMetal;uniform float uOpacity;
      varying vec3 vPosition;varying vec3 vNormal;varying vec2 vUV;
      void main(){vec3 n=normalize(vNormal);vec3 view=normalize(vec3(0.0,0.0,10.0)-vPosition);
        vec3 key=normalize(vec3(-3.0,5.0,5.0)-vPosition);vec3 fill=normalize(vec3(4.0,1.0,2.0)-vPosition);
        float diffuse=max(dot(n,key),0.0)*0.70+max(dot(n,fill),0.0)*0.32;
        float shine=pow(max(dot(n,normalize(key+view)),0.0),62.0);
        float edge=pow(1.0-max(dot(n,view),0.0),3.0);
        vec3 metal=uColor*(0.30+diffuse)+vec3(0.78,0.83,0.72)*shine*uMetal+vec3(0.13,0.16,0.11)*edge;
        vec3 screen=mix(texture2D(uScreen,vUV).rgb,texture2D(uNextScreen,vUV).rgb,uScreenBlend);
        gl_FragColor=vec4(mix(metal,screen,uTexture),uOpacity);}`;
    const compile = (type,source) => {const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shader unavailable');return shader;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Renderer unavailable');
    const attributes = Object.fromEntries(['Position','Normal','UV'].map(name=>[name,gl.getAttribLocation(program,'a'+name)]));
    const uniforms = Object.fromEntries(['Model','MVP','Color','Texture','Metal','Screen','NextScreen','ScreenBlend','Opacity'].map(name=>[name,gl.getUniformLocation(program,'u'+name)]));
    const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    const multiply=(a,b)=>{const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;};
    const rotation=(axis,angle)=>{const m=identity(),c=Math.cos(angle),s=Math.sin(angle);if(axis==='x'){m[5]=c;m[6]=s;m[9]=-s;m[10]=c;}if(axis==='y'){m[0]=c;m[2]=-s;m[8]=s;m[10]=c;}if(axis==='z'){m[0]=c;m[1]=s;m[4]=-s;m[5]=c;}return m;};
    const contour=(width,height,radius,z)=>{
      const points=[],corners=[[width/2-radius,-height/2+radius,-Math.PI/2],[width/2-radius,height/2-radius,0],[-width/2+radius,height/2-radius,Math.PI/2],[-width/2+radius,-height/2+radius,Math.PI]];
      for(const [cx,cy,start] of corners)for(let i=0;i<=12;i++){const a=start+i*Math.PI/24;points.push([cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,z]);}return points;
    };
    const mesh=(positions,normals,uvs,color,metal=0,texture=0)=>{
      const result={count:positions.length/3,color,metal,texture};
      for(const [key,values] of [['Position',positions],['Normal',normals],['UV',uvs]]){const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);result[key]=buffer;}return result;
    };
    const face=(width,height,radius,z,color,texture=0)=>{
      const outline=contour(width,height,radius,z),positions=[],normals=[],uvs=[];
      for(let i=0;i<outline.length;i++)for(const point of [[0,0,z],outline[i],outline[(i+1)%outline.length]]){positions.push(...point);normals.push(0,0,1);uvs.push(point[0]/width+.5,point[1]/height+.5);}
      return mesh(positions,normals,uvs,color,.15,texture);
    };
    const band=(first,second,color,metal)=>{
      const positions=[],normals=[],uvs=[];
      for(let i=0;i<first.length;i++){
        const j=(i+1)%first.length,a=first[i],b=first[j],c=second[i],u=b.map((v,k)=>v-a[k]),v=c.map((x,k)=>x-a[k]);
        const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...normal)||1;
        for(const point of [a,b,c,b,second[j],c]){positions.push(...point);normals.push(...normal.map(n=>-n/length));uvs.push(0,0);}
      }return mesh(positions,normals,uvs,color,metal);
    };
    const outerFront=contour(2.46,5.20,.34,.075),outerBack=contour(2.46,5.20,.34,-.125),frontBevel=contour(2.39,5.13,.30,.14),backBevel=contour(2.39,5.13,.30,-.17);
    const meshes=[
      face(2.39,5.13,.30,-.171,[.025,.03,.035]),
      band(outerBack,backBevel,[.085,.09,.10],.7),
      band(outerFront,outerBack,[.12,.13,.145],.9),
      band(frontBevel,outerFront,[.225,.235,.25],1.0),
      face(2.39,5.13,.30,.142,[.012,.014,.017]),
      face(2.275,4.93,.245,.15,[1,1,1],1)
    ];
    const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
    const [looks,curves,tools,photo,...panels]=await Promise.all(['app-looks.webp','app-curves.webp','app-tools.webp','hibiscus-1280.webp','app-looks-panel.webp','app-curves-panel.webp','app-tools-panel.webp'].map(name=>loadImage(new URL('assets/'+name,import.meta.url))));
    if (!active || !eligible()) {fallback();return;}
    const textures=[looks,curves,tools].map((app,index)=>{
      const textureCanvas=document.createElement('canvas');textureCanvas.width=matchMedia('(pointer:coarse)').matches?512:768;textureCanvas.height=Math.round(textureCanvas.width*1864/860);
      const ctx=textureCanvas.getContext('2d');ctx.drawImage(app,0,0,textureCanvas.width,textureCanvas.height);
      // Photo composites stop before each real tool panel, retaining all controls.
      const bottom=index===1?.485:index===0?.625:.585;
      const destination=[.03*textureCanvas.width,.055*textureCanvas.height,.94*textureCanvas.width,(bottom-.055)*textureCanvas.height];
      const scale=Math.max(destination[2]/photo.width,destination[3]/photo.height),sourceW=destination[2]/scale,sourceH=destination[3]/scale;
      ctx.drawImage(photo,(photo.width-sourceW)*.53,(photo.height-sourceH)*.5,sourceW,sourceH,...destination);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureCanvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return texture;
    });
    const imageTexture = image => {
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return texture;
    };
    const layerTextures=[imageTexture(photo),...panels.map(imageTexture)];
    const photoMesh=face(2.8,2.8*photo.height/photo.width,.025,0,[1,1,1],1);
    const panelMeshes=panels.map(image=>face(3.55,3.55*image.height/image.width,.11,0,[1,1,1],1));
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);gl.useProgram(program);gl.uniform1i(uniforms.Screen,0);gl.uniform1i(uniforms.NextScreen,1);
    const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
    const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
    const keyframes=[{y:-.42,x:.08,z:-.08,camera:11.5,position:0},{y:.33,x:-.05,z:.045,camera:11.8,position:.1},{y:-.18,x:.04,z:-.025,camera:11.5,position:0}];
    const phases=[['Adaptive Looks','Find your starting point.'],['Curves & color','Make every adjustment intentional.'],['Your workspace','Familiar tools. Your arrangement.']];
    const narratives=[['Start with a feeling.','Choose an Adaptive Look, adjust its strength, then shape the details around your photograph.'],['Refine every little detail.','Shape light and contrast with Curves. Refine individual colors with Color Mixer. Every adjustment is yours.'],['Make room for your flow.','Put your most-used tools first. Your arrangement stays with you, ready for the next photograph.']];
    const draw = now => {
      frame=0;if(!active||!visible||document.hidden||gl.isContextLost())return;
      const elapsed=Math.min(48,now-lastFrame||16);lastFrame=now;const blend=1-Math.exp(-elapsed/85);
      current=current.map((value,i)=>value+(target[i]-value)*blend);
      if(layoutDirty){
        const rect=stage.getBoundingClientRect(),storyRect=timeline.getBoundingClientRect(),mobile=matchMedia('(max-width:760px)').matches;
        const lead=mobile?timeline.querySelector('.hero-copy').getBoundingClientRect().height+65:0;
        metrics={width:rect.width,height:rect.height,left:rect.left,storyTop:storyRect.top+latestScroll,storyHeight:storyRect.height,lead,viewportHeight:innerHeight,mobile};layoutDirty=false;
      }
      const ratio=Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.25:1.5);
      const progress=clamp((latestScroll-metrics.storyTop-metrics.lead)/Math.max(1,metrics.storyHeight-metrics.viewportHeight-metrics.lead));
      const segment=Math.min(1,Math.floor(progress*2)),fraction=progress*2-segment,t=smooth(fraction);
      const from=keyframes[segment],to=keyframes[segment+1],pose=Object.fromEntries(Object.keys(from).map(key=>[key,from[key]+(to[key]-from[key])*t]));
      const crossfade=smooth(segment===0?(progress-.29)/.08:(progress-.65)/.08);
      const phase=progress<.33?0:progress<.69?1:2;
      if(phase!==lastPhase){lastPhase=phase;phaseTitle.textContent=phases[phase][0];phaseCopy.textContent=phases[phase][1];counter.textContent=`0${phase+1} / 03`;}
      const narrative=progress<.065?-1:phase;
      if(narrative!==lastNarrative){
        lastNarrative=narrative;opening.classList.toggle('story-hidden',narrative>=0);
        opening.inert=narrative>=0&&!metrics.mobile;opening.setAttribute('aria-hidden',String(narrative>=0&&!metrics.mobile));
        slides.forEach((slide,index)=>{slide.hidden=index!==narrative||metrics.mobile;});
        mobileCopy.querySelector('h2').textContent=narratives[phase][0];mobileCopy.querySelector('p').textContent=narratives[phase][1];
      }
      stage.dataset.sceneProgress=progress.toFixed(3);stage.dataset.scenePhase=String(phase);
      const width=Math.min(1400,Math.round(metrics.width*ratio)),height=Math.min(1400,Math.round(metrics.height*ratio));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const aspect=width/height,f=1/Math.tan(33*Math.PI/360),near=.1,far=30;
      const projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
      const lift=smooth(progress/.20),compact=aspect<.85,sceneScale=compact?.88:1;
      const view=identity();view[14]=-pose.camera-(compact?1.0:0);
      const transform=(x,y,z,rx,ry,rz,scale=1)=>{
        const model=multiply(rotation('z',rz),multiply(rotation('x',rx),rotation('y',ry)));
        for(let i=0;i<12;i++)model[i]*=scale*sceneScale;
        model[12]=x*sceneScale;model[13]=y*sceneScale;model[14]=z;return model;
      };
      const setModel=model=>{gl.uniformMatrix4fv(uniforms.Model,false,model);gl.uniformMatrix4fv(uniforms.MVP,false,multiply(projection,multiply(view,model)));};
      const drawMesh=item=>{
        for(const [name,size] of [['Position',3],['Normal',3],['UV',2]]){gl.bindBuffer(gl.ARRAY_BUFFER,item[name]);gl.enableVertexAttribArray(attributes[name]);gl.vertexAttribPointer(attributes[name],size,gl.FLOAT,false,0,0);}
        gl.uniform3fv(uniforms.Color,item.color);gl.uniform1f(uniforms.Metal,item.metal);gl.uniform1f(uniforms.Texture,item.texture);gl.drawArrays(gl.TRIANGLES,0,item.count);
      };
      setModel(transform(pose.position+lift*.95,lift*.68,-lift*1.2,pose.x+current[1]-.10,pose.y+current[0]+.27,pose.z,1-lift*.32));
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[segment]);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[segment+1]);gl.uniform1f(uniforms.ScreenBlend,crossfade);
      gl.uniform1f(uniforms.Opacity,1);gl.depthMask(true);meshes.forEach(drawMesh);
      if(lift>.001){
        // Real captured panels detach from the screen into separate 3D planes.
        // The handset retreats; the active tool remains the largest foreground layer.
        const drawLayer=(item,texture,model,opacity)=>{
          if(opacity<.003)return;
          setModel(model);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1f(uniforms.ScreenBlend,0);gl.uniform1f(uniforms.Opacity,opacity);drawMesh(item);
        };
        gl.depthMask(false);
        drawLayer(photoMesh,layerTextures[0],transform(-.82*lift,.95*lift,.7*lift,.015,-.13+(current[0]+.27)*.20,-.09*lift,.60+.40*lift),lift);
        for(const [index,opacity] of [[segment,1-crossfade],[segment+1,crossfade]]){
          drawLayer(panelMeshes[index],layerTextures[index+1],transform(.18*lift,-.73*lift,1.65*lift,-.015,.055+(current[0]+.27)*.17,.025*lift,.58+.42*lift),lift*opacity);
        }
        gl.depthMask(true);
      }
      stage.dataset.sceneLayers=lift>.95?'photo,tool,handset':'separating';
      if(!ready){ready=true;stage.classList.add('webgl-ready');stage.setAttribute('role','group');stage.setAttribute('aria-label','Scroll-driven 3D Aki Studio app showcase');timeline?.classList.add('story-enabled');layoutDirty=true;stage.tabIndex=0;stage.setAttribute('aria-describedby','scene-instructions');schedule();}
      if(current.some((value,i)=>Math.abs(value-target[i])>.0006))schedule();
    };
    const schedule=()=>{if(active&&visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw);};
    stage.append(canvas);
    const reset=()=>{dragging=null;target=[-.27,.10];schedule();};
    on(stage,'pointerdown',event=>{if(event.button!==0||event.target.closest('a,button'))return;dragging={id:event.pointerId,x:event.clientX,y:event.clientY,start:target.slice()};},{passive:true});
    on(stage,'pointermove',event=>{
      if(!metrics)return;
      if(dragging?.id===event.pointerId){
        const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
        if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){reset();return;}
        target=[Math.max(-1.12,Math.min(.72,dragging.start[0]+dx/metrics.width*1.7)),Math.max(-.22,Math.min(.3,dragging.start[1]+dy/metrics.height*.4))];
      }else if(event.pointerType==='mouse')target=[-.27+((event.clientX-metrics.left)/metrics.width-.5)*.48,.10];
      else return;schedule();
    },{passive:true});
    on(stage,'pointerup',()=>{dragging=null;},{passive:true});on(stage,'pointercancel',reset,{passive:true});on(stage,'pointerleave',reset,{passive:true});
    on(stage,'keydown',event=>{if(event.key==='ArrowLeft')target[0]=Math.max(-1.12,target[0]-.16);else if(event.key==='ArrowRight')target[0]=Math.min(.72,target[0]+.16);else if(event.key==='Home'){target=[-.27,.10];}else return;event.preventDefault();schedule();});
    on(document,'visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;lastFrame=0;layoutDirty=true;if(!document.hidden)schedule();});
    on(window,'scroll',()=>{latestScroll=scrollY;schedule();},{passive:true});
    on(motion,'change',()=>{if(!eligible())fallback();});if(connection)on(connection,'change',()=>{if(!eligible())fallback();});
    const resize=new ResizeObserver(()=>{layoutDirty=true;lastNarrative=-2;schedule();});resize.observe(stage);resize.observe(timeline);resize.observe(timeline.querySelector('.hero-copy'));cleanups.push(()=>resize.disconnect());
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});observer.observe(stage);cleanups.push(()=>observer.disconnect());
    cleanups.push(()=>{for(const buffer of buffers)gl.deleteBuffer(buffer);for(const shader of shaders)gl.deleteShader(shader);for(const texture of [...textures,...layerTextures])gl.deleteTexture(texture);gl.deleteProgram(program);});
    schedule();
  } catch {
    // A blocked context, failed texture, or unsupported driver keeps the CSS scene.
    fallback();
  }
}
