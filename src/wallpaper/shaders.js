/**
 * shaders.js — WebGL fragment shader sources and metadata
 *
 * Each shader receives these uniforms from Wallpaper.jsx:
 *   u_time    float      seconds since mount
 *   u_res     vec2       canvas size in pixels
 *   u_mouse   vec2       eased cursor pos (GL origin: bottom-left)
 *   u_mTarget vec2       raw cursor pos (no easing)
 *   u_clicks  vec4[8]    ring buffer — xy=pixel pos, z=time-of-click, w=1 if active
 */

const VERT = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const HEAD = `precision highp float;
uniform float u_time;
uniform vec2  u_res;
uniform vec2  u_mouse;
uniform vec2  u_mTarget;
uniform vec4  u_clicks[8];
`;

// ── 1. AURORA DRIFT ──────────────────────────────────────────────────────────
const AURORA = HEAD + `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+7.0;a*=0.5;}
  return v;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.xy;
  vec2 m=u_mouse/u_res.xy;
  float aspect=u_res.x/u_res.y;
  vec2 p=vec2(uv.x*aspect,uv.y);
  float t=u_time*0.08;
  vec2 toM=uv-m;
  float pull=smoothstep(0.55,0.0,length(toM));
  float yBend=(m.y-0.5)*pull*0.45;
  float warp=fbm(p*1.4+vec2(t,t*0.35))-0.5;
  float y=uv.y+warp*0.18+yBend;
  float b1=exp(-pow((y-0.70+0.05*sin(p.x*3.0+t*4.0)),2.0)*38.0);
  float b2=exp(-pow((y-0.50+0.07*sin(p.x*2.2+t*5.5)),2.0)*28.0);
  float b3=exp(-pow((y-0.32+0.04*sin(p.x*4.0+t*3.0)),2.0)*50.0);
  vec3 cA=vec3(0.25,0.95,0.78),cB=vec3(0.45,0.55,1.05),cC=vec3(0.88,0.32,0.95);
  vec3 col=cA*b1+cB*b2+cC*b3;
  vec3 bg=mix(vec3(0.06,0.03,0.13),vec3(0.01,0.01,0.05),uv.y);
  col=bg+col*1.05;
  vec2 sp=floor(p*220.0);
  float star=pow(hash(sp),280.0)*(1.0-smoothstep(0.15,0.55,uv.y));
  col+=vec3(star);
  for(int i=0;i<8;i++){
    if(u_clicks[i].w>0.5){
      vec2 cp=u_clicks[i].xy/u_res.xy;
      float age=u_time-u_clicks[i].z,r=age*0.45;
      float d=length((uv-cp)*vec2(aspect,1.0));
      float ring=exp(-pow(d-r,2.0)*240.0)*exp(-age*0.7);
      col+=vec3(0.55,0.75,1.1)*ring*1.4;
      float ring2=exp(-pow(d-r*0.85,2.0)*320.0)*exp(-age*0.9);
      col+=vec3(0.95,0.45,0.85)*ring2*0.9;
    }
  }
  vec2 vc=uv-0.5;
  col*=1.0-dot(vc,vc)*0.5;
  gl_FragColor=vec4(col,1.0);
}`;

// ── 2. PLASMA WELLS ──────────────────────────────────────────────────────────
const PLASMA = HEAD + `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.y;
  vec2 m=u_mouse/u_res.y;
  float aspect=u_res.x/u_res.y;
  float t=u_time*0.28;
  float f=0.0;
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec2 c=vec2(aspect*0.5+(aspect*0.42)*cos(t*(0.55+0.07*fi)+fi*1.31),0.5+0.32*sin(t*(0.7+0.05*fi)+fi*2.17));
    f+=0.055/(length(uv-c)+0.05);
  }
  f+=0.20/(length(uv-m)+0.045);
  for(int i=0;i<8;i++){
    if(u_clicks[i].w>0.5){
      vec2 cp=u_clicks[i].xy/u_res.y;
      float age=u_time-u_clicks[i].z;
      float pulse=0.25*exp(-age*0.55)*(1.0+0.4*sin(age*8.0)*exp(-age*2.0));
      f+=pulse/(length(uv-cp)+0.04);
    }
  }
  float v=f*0.55;
  vec3 col=vec3(0.04,0.01,0.10);
  col=mix(col,vec3(0.35,0.06,0.55),smoothstep(0.45,1.4,v));
  col=mix(col,vec3(0.98,0.30,0.50),smoothstep(1.2,2.5,v));
  col=mix(col,vec3(1.00,0.82,0.38),smoothstep(2.4,4.0,v));
  col=mix(col,vec3(1.00,1.00,0.92),smoothstep(4.0,6.5,v));
  float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  col+=(g-0.5)*0.015;
  gl_FragColor=vec4(col,1.0);
}`;

// ── 3. VORONOI CRYSTAL ───────────────────────────────────────────────────────
const VORONOI = HEAD + `
vec2 hash2(vec2 p){
  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.y;
  vec2 m=u_mouse/u_res.y;
  float t=u_time*0.22;
  vec2 p=uv*7.5,ip=floor(p),fp=fract(p);
  float minD=1e9,secondD=1e9;
  vec2 closest=vec2(0.0);
  for(int j=-1;j<=1;j++){
    for(int i=-1;i<=1;i++){
      vec2 g=vec2(float(i),float(j));
      vec2 o=hash2(ip+g);
      o=0.5+0.5*sin(t+6.283*o);
      vec2 r=g+o-fp;
      float d=dot(r,r);
      if(d<minD){secondD=minD;minD=d;closest=ip+g+o;}
      else if(d<secondD){secondD=d;}
    }
  }
  float edge=sqrt(secondD)-sqrt(minD);
  vec2 cellCenter=closest/7.5;
  float mDist=length(cellCenter-m);
  float glow=exp(-mDist*3.0);
  float shock=0.0;
  for(int i=0;i<8;i++){
    if(u_clicks[i].w>0.5){
      vec2 cp=u_clicks[i].xy/u_res.y;
      float age=u_time-u_clicks[i].z,r=age*0.85;
      float d=length(cellCenter-cp);
      shock+=exp(-pow(d-r,2.0)*55.0)*exp(-age*0.6);
    }
  }
  vec3 col=vec3(0.025,0.03,0.055);
  float cid=hash2(floor(closest)).x;
  vec3 tint=0.5+0.5*cos(6.283*(vec3(0.0,0.18,0.42)+cid*0.6));
  col=mix(col,tint*0.18,0.55);
  float edgeW=mix(0.012,0.045,glow);
  float edgeMask=smoothstep(edgeW,0.0,edge);
  col+=edgeMask*vec3(0.55,0.78,1.05)*(0.45+glow*2.4);
  col+=vec3(0.22,0.55,1.0)*glow*0.55;
  col+=vec3(1.0,0.65,0.92)*shock*1.6;
  vec2 vc=gl_FragCoord.xy/u_res.xy-0.5;
  col*=1.0-dot(vc,vc)*0.55;
  gl_FragColor=vec4(col,1.0);
}`;

// ── 4. NEON HORIZON ──────────────────────────────────────────────────────────
const NEON = HEAD + `
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res.xy)/u_res.y;
  vec2 m=(u_mouse-0.5*u_res.xy)/u_res.y;
  float rot=0.0;
  for(int i=0;i<8;i++){
    if(u_clicks[i].w>0.5){float age=u_time-u_clicks[i].z;rot+=exp(-age*0.7);}
  }
  rot=clamp(rot,0.0,8.0);
  float h=0.0+m.y*0.18,tilt=m.x*0.15;
  float horizonY=h+uv.x*tilt;
  vec3 col;
  if(uv.y>horizonY){
    float sky=(uv.y-horizonY)/0.65;
    col=mix(vec3(0.35,0.06,0.30),vec3(0.06,0.01,0.18),clamp(sky,0.0,1.0));
    col+=vec3(1.0,0.45,0.55)*smoothstep(0.10,0.0,uv.y-horizonY)*0.45;
    vec2 sunC=vec2(m.x*0.35,horizonY+0.22-m.y*0.05);
    float sd=length(uv-sunC);
    float sun=smoothstep(0.21,0.19,sd);
    float band=smoothstep(0.0,0.04,sin((uv.y-sunC.y)*50.0)-(uv.y-sunC.y)*8.0);
    col=mix(col,vec3(1.0,0.85,0.4),sun*band);
    col=mix(col,vec3(1.0,0.4,0.55),sun*(1.0-band)*0.6);
    col+=vec3(1.0,0.45,0.65)*smoothstep(0.42,0.18,sd)*0.35;
    float s=fract(sin(dot(floor(uv*200.0),vec2(12.9898,78.233)))*43758.5453);
    col+=vec3(pow(s,400.0))*smoothstep(0.0,0.5,uv.y-horizonY);
  } else {
    float z=0.5/max(horizonY-uv.y,0.0008);
    float x=(uv.x-horizonY*0.0)*z;
    float scroll=u_time*0.55;
    vec2 grid=abs(fract(vec2(x*0.7,z*0.7+scroll))-0.5);
    float line=min(grid.x,grid.y);
    float thickness=0.025+clamp(z*0.004,0.0,0.05);
    float g=smoothstep(thickness,0.0,line);
    col=mix(vec3(0.10,0.02,0.18),vec3(0.0),smoothstep(0.0,12.0,z));
    col+=vec3(1.0,0.25,0.75)*g*(2.0/(z*0.35+1.0));
    col+=vec3(1.0,0.5,0.6)*smoothstep(0.0,0.05,horizonY-uv.y)*0.18*smoothstep(0.3,0.0,abs(uv.x-m.x*0.35));
  }
  if(rot>0.001){
    float a=rot*0.6;
    vec3 r=vec3(col.r*cos(a)+col.g*sin(a),col.g*cos(a)+col.b*sin(a),col.b*cos(a)+col.r*sin(a));
    col=mix(col,abs(r)*1.1,clamp(rot*0.4,0.0,0.85));
  }
  gl_FragColor=vec4(col,1.0);
}`;

// ── 5. LIQUID MERCURY ────────────────────────────────────────────────────────
const MERCURY = HEAD + `
float heightAt(vec2 p){
  float t=u_time*0.45;
  vec2 m=u_mouse/u_res.y;
  float h=0.10*sin(p.x*5.5+t*1.3)*cos(p.y*4.7-t*1.1);
  h+=0.06*sin((p.x+p.y)*7.0+t*1.7);
  h+=0.04*sin(p.x*p.y*3.5+t*2.3);
  float dm=length(p-m);
  h+=0.32*exp(-dm*5.5)*sin(dm*22.0-u_time*5.0);
  for(int i=0;i<8;i++){
    if(u_clicks[i].w>0.5){
      vec2 cp=u_clicks[i].xy/u_res.y;
      float age=u_time-u_clicks[i].z,dd=length(p-cp),r=age*0.55;
      h+=sin((dd-r)*28.0)*exp(-pow(dd-r,2.0)*22.0)*exp(-age*0.7)*1.4;
    }
  }
  return h;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.y;
  vec2 m=u_mouse/u_res.y;
  float eps=0.0035;
  float h=heightAt(uv),hx=heightAt(uv+vec2(eps,0.0))-h,hy=heightAt(uv+vec2(0.0,eps))-h;
  vec3 n=normalize(vec3(-hx,-hy,eps*1.4));
  vec3 lightDir=normalize(vec3(0.45,0.65,0.85));
  float diff=max(dot(n,lightDir),0.0),spec=pow(diff,38.0);
  float phase=n.x*2.4+n.y*2.4+h*3.2+u_time*0.18;
  vec3 irid=0.5+0.5*cos(6.283*(vec3(0.0,0.33,0.67)+phase));
  vec3 base=vec3(0.07,0.08,0.13);
  vec3 col=mix(base,irid,0.78);
  col*=0.35+0.85*diff;
  col+=vec3(1.0,0.96,1.0)*spec*1.25;
  float dmouse=length(uv-m);
  col+=vec3(1.0)*exp(-dmouse*14.0)*0.55;
  vec2 vc=gl_FragCoord.xy/u_res.xy-0.5;
  col*=1.0-dot(vc,vc)*0.55;
  gl_FragColor=vec4(col,1.0);
}`;

export const VERT_SRC = VERT;

export const SHADERS = {
  plasma:  { name: 'Plasma Wells',    tagline: 'drag to attract the field · click to seed wells',  frag: PLASMA  },
  aurora:  { name: 'Aurora Drift',    tagline: 'drag to bend the bands · click to ripple',          frag: AURORA  },
  voronoi: { name: 'Voronoi Crystal', tagline: 'drag to brighten cells · click for a shockwave',    frag: VORONOI },
  neon:    { name: 'Neon Horizon',    tagline: 'drag to tilt the horizon · click to flip palette',  frag: NEON    },
  mercury: { name: 'Liquid Mercury',  tagline: 'drag to push the surface · click to drop a stone',  frag: MERCURY },
};
