const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec2  uMouse;
uniform float uScroll;
uniform vec2  uResolution;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}

void main() {
  vec2 uv=vUv;
  float aspect=uResolution.x/uResolution.y;
  vec2 st=vec2(uv.x*aspect,uv.y);
  
  // Mouse
  float md=length(st-uMouse*vec2(aspect,1.));
  float warp=smoothstep(0.45,0.,md)*0.06;
  vec2 guv=st+warp*(st-uMouse*vec2(aspect,1.));
  
  // Scroll drives VISIBLE breathing — grid spacing changes 2x
  float breathe=1.0+sin(uScroll*3.14*2.)*0.3;
  float gs=0.06*breathe;
  
  // Grid lines — much brighter
  float hl=1.-smoothstep(0.,0.025,abs(fract(guv.y/gs)-.5)*2.);
  float vl=1.-smoothstep(0.,0.025,abs(fract(guv.x/gs)-.5)*2.);
  float grid=max(hl,vl)*0.18;
  
  // Nodes pulse
  vec2 gi=floor(guv/gs);
  vec2 gc=(gi+.5)*gs;
  float nd=length(guv-gc)/gs;
  float pulse=1.+sin(uScroll*6.28+uTime*0.5)*0.5;
  float ng=exp(-nd*4.)*0.2*pulse;
  float node=step(0.995,noise(gi*7.3+uScroll*.3));
  ng*=node;
  
  // Particles — VISIBLE speed change with scroll
  float sp=0.15+uScroll*2.5;
  float py=fract(guv.y/gs+uTime*sp*.4+hash(gi));
  float px=guv.x/gs-gi.x-.5;
  float p1=smoothstep(.02,0.,abs(px))*smoothstep(.05,0.,abs(py-.5));
  float py2=fract(guv.x/gs+uTime*sp*.5+hash(gi+99.)*2.);
  float px2=guv.y/gs-gi.y-.5;
  float p2=smoothstep(.02,0.,abs(px2))*smoothstep(.05,0.,abs(py2-.5));
  float pt=(p1+p2)*0.25;
  
  // Mouse glow
  float mg=exp(-md*3.5)*0.1;
  
  float a=grid+ng+pt+mg;
  
  // Dramatic color shift with scroll
  vec3 teal=vec3(.392,1.,.855);
  vec3 amber=vec3(1.,.82,.4);
  vec3 purple=vec3(.6,.5,1.);
  float t=uScroll;
  vec3 col=mix(teal,amber,smoothstep(0.,.35,t));
  col=mix(col,purple,smoothstep(.35,.65,t));
  col=mix(col,teal,smoothstep(.65,1.,t));
  col=mix(col,vec3(1.,.85,.5),exp(-md*2.5)*.2);
  
  float vig=1.-smoothstep(.3,1.4,length(uv-.5)*2.);
  a*=vig;
  
  gl_FragColor=vec4(col*a,a*.75);
}
`;

export { vertexShader, fragmentShader };
