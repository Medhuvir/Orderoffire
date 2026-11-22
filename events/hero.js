// Order of Fire — Event hero
// 3D extruded glyph spinning inside generated fire, with rising sparks, drifting ash,
// and a heat-haze distortion pass. Glyph is chosen by the hero's data-glyph attribute.

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GLYPH_FILES = {
  'animus-accensus': 'ANIMUS ACCENSUS', artas: 'ARTAS', gwitas: 'GWITAS', ianoos: 'IANOOS',
  'iove-fulgente': 'IOVE FULGENTE', mitra: 'MITRA', sakmontas: 'SAKMONTAS', solos: 'SOLOS',
  soma: 'SOMA', thrakos: 'THRAKOS', toros: 'TOROS', yugtas: 'YUGTAS',
};

const PALETTE = {
  void: '#150c05', earth: '#4A2F1B', initiate: '#A0522D', orange: '#E06E04',
  aquila: '#C08A3C', gilded: '#E3BB63', ivory: '#FDF5E6', thunder: '#6C645A',
};

// brand easing — cubic-bezier(0.16, 1, 0.3, 1), approximated as easeOutExpo-ish
const easeOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const NOISE_GLSL = /* glsl */`
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
`;

const FULLSCREEN_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function fireMaterial({ foreground }) {
  const c = k => new THREE.Color(PALETTE[k]);
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uIntensity: { value: 1 },
      uGlyph: { value: new THREE.Vector2(0.5, 0.55) },
      uC0: { value: c('void') }, uC1: { value: c('earth') }, uC2: { value: c('initiate') },
      uC3: { value: c('orange') }, uC4: { value: c('gilded') }, uC5: { value: c('ivory') },
    },
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: /* glsl */`
      uniform float uTime, uAspect, uIntensity;
      uniform vec2 uGlyph;
      uniform vec3 uC0, uC1, uC2, uC3, uC4, uC5;
      varying vec2 vUv;
      ${NOISE_GLSL}
      vec3 ramp(float x){
        vec3 c = mix(uC0, uC1, smoothstep(0.00, 0.18, x));
        c = mix(c, uC2, smoothstep(0.15, 0.36, x));
        c = mix(c, uC3, smoothstep(0.32, 0.58, x));
        c = mix(c, uC4, smoothstep(0.6, 0.88, x));
        c = mix(c, uC5 * 1.2, smoothstep(0.94, 1.00, x));
        return c;
      }
      void main(){
        vec2 uv = vUv;
        vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y);
        float t = uTime;
        // domain-warped, rising turbulence
        vec2 q = vec2(fbm(p * 2.0 + vec2(0.0, -t * 0.55)), fbm(p * 2.0 + vec2(5.2, -t * 0.65)));
        float n = fbm(p * vec2(2.6, 2.0) + q * 1.7 + vec2(0.0, -t * 1.35));
        float base = 1.0 - uv.y;
        ${foreground ? `
          float flame = (n * 1.25 - uv.y * 2.4 - 0.22) * 1.7;
        ` : `
          float flame = (n * 1.2 - uv.y * 1.1 - 0.2) * 1.5;
          float column = exp(-pow((uv.x - uGlyph.x) * uAspect * 1.4, 2.0) * 2.0);
          flame += column * 0.12 * base * n;
        `}
        flame = clamp(flame, 0.0, 1.0);
        vec3 col = ramp(flame);
        ${foreground ? `
          float a = smoothstep(0.15, 0.75, flame) * 0.35;
          gl_FragColor = vec4(col * a * uIntensity, 1.0);
        ` : `
          // gilded halo behind the glyph
          vec2 d = (uv - uGlyph) * vec2(uAspect, 1.0);
          float halo = exp(-dot(d, d) * 7.0);
          float pulse = 0.85 + 0.15 * sin(t * 1.7) * sin(t * 0.9);
          col += uC3 * halo * 0.1 * pulse;
          gl_FragColor = vec4(col * uIntensity, 1.0);
        `}
      }
    `,
    depthWrite: false,
    depthTest: !foreground ? false : true,
    transparent: foreground,
    blending: foreground ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function particleMaterial({ ash, pixelRatio }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: ash ? 16 : 14 },
      uPixelRatio: { value: pixelRatio },
      uBounds: { value: new THREE.Vector2(6, 4) },
      uMouse: { value: new THREE.Vector3(999, 999, 0) },
      uSpeed: { value: ash ? 0.035 : 0.11 },
      uIntensity: { value: 1 },
      uHot: { value: new THREE.Color(PALETTE.ivory) },
      uWarm: { value: new THREE.Color(PALETTE.orange) },
      uGold: { value: new THREE.Color(PALETTE.gilded) },
      uAsh: { value: new THREE.Color(PALETTE.thunder) },
    },
    vertexShader: /* glsl */`
      uniform float uTime, uSize, uPixelRatio, uSpeed;
      uniform vec2 uBounds;
      uniform vec3 uMouse;
      attribute vec4 aSeed;
      varying float vLife;
      varying float vHeat;
      varying float vRot;
      varying float vSeed;
      void main(){
        float speed = mix(0.6, 1.8, aSeed.y);
        float life = fract(uTime * speed * uSpeed + aSeed.x);
        vec3 p;
        p.x = (aSeed.z - 0.5) * uBounds.x * 2.0;
        p.y = -uBounds.y * 1.1 + life * uBounds.y * 2.5;
        p.z = mix(-2.5, 3.2, aSeed.w);
        // turbulent sway that widens as it rises
        p.x += sin(uTime * 1.3 + aSeed.x * 30.0 + life * 6.0) * 0.45 * life;
        p.x += sin(uTime * 3.7 + aSeed.w * 20.0) * 0.04;
        p.x += life * life * (aSeed.w - 0.5) * 1.8;
        p.y += sin(uTime * 2.1 + aSeed.z * 40.0) * 0.05;
        // pointer pushes embers aside
        vec2 dm = p.xy - uMouse.xy;
        float md = length(dm);
        p.xy += normalize(dm + 1e-4) * 0.9 * exp(-md * md * 1.2) * uMouse.z;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.7, 1.0, life));
        gl_PointSize = uSize * mix(0.35, 1.3, aSeed.y) * uPixelRatio * (10.0 / -mv.z) * mix(1.0, 0.5, life);
        vLife = fade;
        vHeat = (0.6 + 0.4 * sin(uTime * 18.0 + aSeed.x * 100.0)) * (1.0 - life);
        vRot = uTime * (aSeed.y - 0.5) * 3.0 + aSeed.z * 6.28;
        vSeed = aSeed.w;
      }
    `,
    fragmentShader: ash ? /* glsl */`
      uniform vec3 uAsh, uWarm;
      uniform float uIntensity;
      varying float vLife, vHeat, vRot, vSeed;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), k = cos(vRot);
        c = mat2(k, -s, s, k) * c;
        c.y *= 2.2 + vSeed * 1.5;               // thin, tumbling flake
        float d = length(c) + 0.08 * sin(atan(c.y, c.x) * 5.0 + vSeed * 10.0);
        float a = smoothstep(0.42, 0.3, d) * vLife * 0.7;
        // a few flakes still hold an ember edge
        float ember = step(0.78, vSeed) * vHeat;
        vec3 col = mix(uAsh * 0.12, uWarm * 1.6, ember * smoothstep(0.1, 0.38, d));
        if (a < 0.01) discard;
        gl_FragColor = vec4(col * uIntensity, a);
      }
    ` : /* glsl */`
      uniform vec3 uHot, uWarm, uGold;
      uniform float uIntensity;
      varying float vLife, vHeat, vSeed;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float core = smoothstep(0.5, 0.0, d);
        core *= core;
        vec3 col = mix(mix(uWarm, uGold, vSeed), uHot, vHeat * 0.7) * (1.4 + vHeat * 2.2);
        gl_FragColor = vec4(col * core * vLife * uIntensity, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: ash ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
}

function makeParticles(count, ash, pixelRatio) {
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const pts = new THREE.Points(geo, particleMaterial({ ash, pixelRatio }));
  pts.frustumCulled = false;
  return pts;
}

const HeatHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uStrength: { value: 1 },
    uAspect: { value: 1 },
    uMouse: { value: new THREE.Vector2(-1, -1) },
    uMouseAmt: { value: 0 },
  },
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uStrength, uAspect, uMouseAmt;
    uniform vec2 uMouse;
    varying vec2 vUv;
    ${NOISE_GLSL}
    void main(){
      vec2 uv = vUv;
      float rise = pow(1.0 - uv.y, 1.6);
      vec2 nUv = vec2(uv.x * uAspect * 7.0, uv.y * 5.0 - uTime * 1.7);
      vec2 d = vec2(noise(nUv) - 0.5, noise(nUv + vec2(17.0, 3.0)) - 0.5);
      float m = (0.3 + rise * 1.2) * uStrength;
      // pointer: a pocket of shimmering heat that follows the cursor
      vec2 mp = (uv - uMouse) * vec2(uAspect, 1.0);
      float ripple = exp(-dot(mp, mp) * 16.0) * uMouseAmt;
      vec2 nUv2 = uv * 22.0 - vec2(0.0, uTime * 3.0);
      vec2 d2 = vec2(noise(nUv2) - 0.5, noise(nUv2 + 9.0) - 0.5);
      uv += d * 0.014 * m + d2 * 0.03 * ripple;
      // subtle chromatic split toward the edges
      vec2 dir = uv - 0.5;
      float ca = 0.0012 + dot(dir, dir) * 0.006 + ripple * 0.004;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;
      // vignette
      float v = smoothstep(1.15, 0.25, length(dir * vec2(uAspect * 0.75, 1.0)));
      col *= mix(0.45, 1.0, v);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

async function buildGlyph(url) {
  const text = await fetch(url).then(r => {
    if (!r.ok) throw new Error(`Glyph not found: ${url}`);
    return r.text();
  });
  const data = new SVGLoader().parse(text);
  const shapes = data.paths.flatMap(p => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 7, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.55,
    bevelSegments: 5, curveSegments: 28,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const center = new THREE.Vector3();
  bb.getCenter(center);
  geo.translate(-center.x, -center.y, -center.z);
  const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(PALETTE.gilded),
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.25,
    emissive: new THREE.Color(PALETTE.orange),
    emissiveIntensity: 0.06,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const s = 3.1 / size;
  mesh.scale.set(s, -s, s); // SVG y-axis points down
  return { mesh, mat };
}

async function buildModel(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  root.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(root);
  pivot.scale.setScalar(3.4 / Math.max(size.x, size.y));
  const mats = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    m.envMapIntensity = 0.7;
    m.color = new THREE.Color(PALETTE.aquila);
    m.emissive = new THREE.Color(PALETTE.orange);
    m.emissiveIntensity = 0.04;
    mats.push(m);
  });
  return { mesh: pivot, mats };
}

export async function initHero(host) {
  const canvas = host.querySelector('canvas.hero-canvas');
  const glyphKey = (host.dataset.glyph || 'solos').toLowerCase();
  const glyphFile = GLYPH_FILES[glyphKey] || GLYPH_FILES.solos;
  const glyphBase = host.dataset.glyphBase || '../images/glyphs/Updated/SVG/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 720px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    host.classList.add('no-webgl');
    return;
  }
  const pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.void);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // fire: one plane far behind, one additive plane in front of the glyph's base
  const fireBack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fireMaterial({ foreground: false }));
  fireBack.position.z = -5;
  fireBack.renderOrder = -10;
  scene.add(fireBack);
  const fireFront = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fireMaterial({ foreground: true }));
  fireFront.position.z = 2.2;
  fireFront.renderOrder = 10;
  scene.add(fireFront);

  const ash = makeParticles(small ? 140 : 280, true, pixelRatio);
  const sparks = makeParticles(small ? 380 : 800, false, pixelRatio);
  scene.add(ash, sparks);

  // firelight
  const fireLight = new THREE.PointLight(new THREE.Color(PALETTE.orange), 30, 14, 1.6);
  fireLight.position.set(0, -2.6, 2.5);
  const keyLight = new THREE.DirectionalLight(new THREE.Color(PALETTE.ivory), 0.8);
  keyLight.position.set(3, 4, 6);
  const rimLight = new THREE.DirectionalLight(new THREE.Color(PALETTE.gilded), 2.4);
  rimLight.position.set(-4, 2, -5);
  scene.add(fireLight, keyLight, rimLight);

  const glyphGroup = new THREE.Group();
  scene.add(glyphGroup);
  // data-model (a .glb) takes precedence; the extruded SVG glyph is the fallback
  let glyphMats = [];
  try {
    if (!host.dataset.model) throw new Error('no model');
    const { mesh, mats } = await buildModel(host.dataset.model);
    glyphGroup.add(mesh);
    glyphMats = mats;
  } catch (e) {
    if (host.dataset.model) console.warn('Model failed, using SVG glyph', e);
    if (!host.dataset.glyph) { host.classList.add('no-webgl'); }
    else try {
      const { mesh, mat } = await buildGlyph(glyphBase + encodeURIComponent(glyphFile) + '.svg');
      glyphGroup.add(mesh);
      glyphMats = [mat];
    } catch (e2) { console.warn(e2); }
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const heat = new ShaderPass(HeatHazeShader);
  composer.addPass(heat);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // layout
  let viewW = 1, viewH = 1, glyphX = 0, glyphY = 0;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const aspect = w / h;
    const fit = (z) => {
      const dist = camera.position.z - z;
      const hh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      return [hh * aspect, hh];
    };
    const [bw, bh] = fit(fireBack.position.z);
    fireBack.scale.set(bw * 1.04, bh * 1.04, 1);
    const [fw, fh] = fit(fireFront.position.z);
    fireFront.scale.set(fw * 1.04, fh * 1.04, 1);
    [viewW, viewH] = fit(0);
    // desktop: glyph sits right of the headline; mobile: glyph rides high, centered
    const wide = aspect > 1.15;
    glyphX = wide ? viewW * 0.2 : 0;
    glyphY = wide ? viewH * 0.04 : viewH * 0.17;
    const sc = wide ? 1 : Math.min(1, viewW / 4.4);
    glyphGroup.scale.setScalar(sc);
    [fireBack, fireFront].forEach(m => m.material.uniforms.uAspect.value = aspect);
    heat.uniforms.uAspect.value = aspect;
    const gu = new THREE.Vector2(0.5 + glyphX / viewW, 0.5 + glyphY / viewH);
    fireBack.material.uniforms.uGlyph.value.copy(gu);
    [sparks, ash].forEach(p => p.material.uniforms.uBounds.value.set(viewW * 0.6, viewH * 0.55));
  }
  resize();
  new ResizeObserver(resize).observe(host);

  // pointer
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0, u: -1, v: -1 };
  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    mouse.u = (e.clientX - r.left) / r.width;
    mouse.v = 1 - (e.clientY - r.top) / r.height;
    mouse.tx = mouse.u * 2 - 1;
    mouse.ty = mouse.v * 2 - 1;
    mouse.target = 1;
  });
  host.addEventListener('pointerleave', () => { mouse.target = 0; mouse.tx = 0; mouse.ty = 0; });

  // scroll falloff
  let scrollK = 0;
  const onScroll = () => {
    const r = host.getBoundingClientRect();
    scrollK = THREE.MathUtils.clamp(-r.top / r.height, 0, 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const clock = new THREE.Clock();
  let t = reduced ? 4.2 : 0;
  let running = false, raf = 0, visible = true;
  const introDur = 2.6;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) t += dt;
    const intro = reduced ? 1 : easeOut(Math.min(t / introDur, 1));

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    mouse.active += (mouse.target - mouse.active) * 0.05;

    const fade = 1 - scrollK * 0.65;
    for (const m of [fireBack, fireFront]) {
      m.material.uniforms.uTime.value = t;
      m.material.uniforms.uIntensity.value = intro * fade;
    }
    for (const p of [sparks, ash]) {
      const u = p.material.uniforms;
      u.uTime.value = t + 40; // pre-warm so particles are already in flight
      u.uIntensity.value = intro * fade;
      u.uMouse.value.set(mouse.x * viewW / 2, mouse.y * viewH / 2, mouse.active);
    }
    heat.uniforms.uTime.value = t;
    heat.uniforms.uStrength.value = 0.6 + 0.4 * intro;
    heat.uniforms.uMouse.value.set(mouse.u, mouse.v);
    heat.uniforms.uMouseAmt.value = mouse.active;

    // glyph: rises out of the flame, then turns steadily
    const spinRate = parseFloat(host.dataset.spin || '0.22'); // rad/s — slow, ceremonial turn
    const spin = reduced ? 0.4 : t * spinRate + (1 - intro) * -1.4;
    glyphGroup.rotation.y = spin + mouse.x * 0.25;
    glyphGroup.rotation.x = Math.sin(t * 0.45) * 0.07 - mouse.y * 0.18;
    glyphGroup.rotation.z = Math.sin(t * 0.31) * 0.025;
    glyphGroup.position.set(
      glyphX,
      glyphY + Math.sin(t * 0.8) * 0.07 - (1 - intro) * 1.4 + scrollK * 1.2,
      (1 - intro) * -2
    );

    const flicker = 0.75 + 0.25 * Math.sin(t * 11.0) * Math.sin(t * 7.3 + 1.2) + 0.1 * Math.sin(t * 23.0);
    fireLight.intensity = 30 * flicker * intro * fade;
    fireLight.position.x = glyphX + Math.sin(t * 1.7) * 0.4;
    for (const m of glyphMats) m.emissiveIntensity = (0.03 + 0.07 * flicker) * intro;

    composer.render();
  }

  function loop() {
    if (!running) return;
    frame();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduced) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible && !document.hidden ? start() : stop();
  }).observe(host);
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : visible && start();
  });

  frame();
  host.classList.add('is-live');
  if (!reduced) start();
}

const hostEl = document.querySelector('[data-oof-hero]');
if (hostEl) initHero(hostEl).catch(err => {
  console.error(err);
  hostEl.classList.add('no-webgl');
});
