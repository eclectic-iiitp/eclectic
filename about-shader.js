/* ════════════════════════════════════════════
   ECLECTIC — 3D Interactive Spinning Logo Shader
   Loads Eclectic logo.jpeg as a texture onto
   a raymarched 3D disc/coin with mouse interaction
   ════════════════════════════════════════════ */

(function () {
  'use strict';

  const canvas = document.getElementById('about-shader-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) {
    canvas.style.background = 'linear-gradient(135deg, #FAF7F2, #E8E0D2)';
    return;
  }

  // ── Vertex Shader ──
  const vertSrc = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // ── Fragment Shader ──
  const fragSrc = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_rotY;
    uniform float u_rotX;
    uniform sampler2D u_texture;
    uniform float u_texReady;

    #define PI 3.14159265
    #define MAX_STEPS 80
    #define MAX_DIST 10.0
    #define SURF_DIST 0.001

    // ── Rotation matrices ──
    mat3 rotateY(float a) {
      float c = cos(a), s = sin(a);
      return mat3(c,0,s, 0,1,0, -s,0,c);
    }

    mat3 rotateX(float a) {
      float c = cos(a), s = sin(a);
      return mat3(1,0,0, 0,c,-s, 0,s,c);
    }

    // ── SDF for disc/coin ──
    float sdCylinder(vec3 p, float r, float h) {
      float d = length(p.xz) - r;
      float d2 = abs(p.y) - h;
      return min(max(d, d2), 0.0) + length(max(vec2(d, d2), 0.0));
    }

    // Beveled edge coin
    float sdCoin(vec3 p, float r, float h, float bevel) {
      float body = sdCylinder(p, r, h);
      // Bevel the edge
      float edge = sdCylinder(p, r + bevel, h - bevel * 0.5);
      float ring = max(sdCylinder(p, r + 0.005, h + 0.005),
                       -sdCylinder(p, r - 0.015, h + 0.01));
      return min(body, ring);
    }

    // Scene SDF
    float sceneSDF(vec3 p) {
      return sdCoin(p, 0.7, 0.045, 0.02);
    }

    // ── Raymarching ──
    float raymarch(vec3 ro, vec3 rd) {
      float t = 0.0;
      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        t += d;
        if (d < SURF_DIST || t > MAX_DIST) break;
      }
      return t;
    }

    // ── Normal estimation ──
    vec3 getNormal(vec3 p) {
      float e = 0.001;
      return normalize(vec3(
        sceneSDF(p + vec3(e,0,0)) - sceneSDF(p - vec3(e,0,0)),
        sceneSDF(p + vec3(0,e,0)) - sceneSDF(p - vec3(0,e,0)),
        sceneSDF(p + vec3(0,0,e)) - sceneSDF(p - vec3(0,0,e))
      ));
    }

    // ── Hash ──
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

      // Camera
      vec3 ro = vec3(0.0, 0.0, 2.2);  // ray origin
      vec3 rd = normalize(vec3(uv, -1.0));  // ray direction

      // Apply rotation to the scene (rotate the ray instead)
      mat3 rotY = rotateY(u_rotY);
      mat3 rotX = rotateX(u_rotX);
      mat3 rot = rotX * rotY;

      // Transform ray into object space
      vec3 ro_t = rot * ro;
      vec3 rd_t = rot * rd;

      // But we want the object to rotate, not the camera
      // So we inverse-rotate the ray
      mat3 invRot = rotateY(-u_rotY) * rotateX(-u_rotX);

      // Actually, let's rotate the sample point instead
      // Re-do: keep camera fixed, rotate in raymarch

      // Simpler approach: transform in scene
      float t = 0.0;
      bool hit = false;
      vec3 hitP;

      for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        // Rotate the point into object space
        vec3 rp = invRot * p;
        float d = sceneSDF(rp);
        t += d;
        if (d < SURF_DIST) {
          hit = true;
          hitP = p;
          break;
        }
        if (t > MAX_DIST) break;
      }

      // ── Background ──
      vec3 cream = vec3(0.980, 0.969, 0.949);
      vec3 parchment = vec3(0.941, 0.922, 0.882);
      float bgGrad = length(uv) * 0.6;
      vec3 bg = mix(cream, parchment, bgGrad);
      // Subtle paper texture
      bg += hash(floor(gl_FragCoord.xy * 0.5)) * 0.012;

      if (!hit) {
        gl_FragColor = vec4(bg, 1.0);
        return;
      }

      // ── Shading ──
      vec3 rp = invRot * hitP;
      vec3 n_obj = getNormal(rp);
      // Transform normal back to world space
      mat3 fwdRot = rotateX(u_rotX) * rotateY(u_rotY);
      vec3 n = normalize(fwdRot * n_obj);

      // Determine if front face, back face, or edge
      // In object space, front face is y > 0, back is y < 0
      bool isFront = rp.y > 0.03;
      bool isBack = rp.y < -0.03;
      bool isEdge = !isFront && !isBack;

      // ── Colors ──
      vec3 darkBrown = vec3(0.322, 0.208, 0.161);
      vec3 warmBrown = vec3(0.533, 0.333, 0.282);
      vec3 gold = vec3(0.761, 0.651, 0.420);
      vec3 goldLight = vec3(0.831, 0.722, 0.478);
      vec3 edgeColor = mix(gold, goldLight, 0.5);

      // ── Texture mapping ──
      vec3 baseColor;

      if (isFront) {
        // Map the front face to logo texture
        vec2 texCoord = vec2(rp.x, rp.z) / 0.7; // normalize to [-1,1]
        texCoord = texCoord * 0.5 + 0.5; // to [0,1]
        texCoord.y = 1.0 - texCoord.y; // flip Y

        if (u_texReady > 0.5) {
          baseColor = texture2D(u_texture, texCoord).rgb;
        } else {
          // Fallback: warm brown with circle pattern
          float r = length(texCoord - 0.5) * 2.0;
          baseColor = mix(warmBrown, darkBrown, smoothstep(0.7, 0.8, r));
        }
      } else if (isBack) {
        // Back face: embossed pattern
        vec2 tc = vec2(rp.x, rp.z) / 0.7 * 0.5 + 0.5;
        float pattern = sin(tc.x * 30.0) * sin(tc.y * 30.0) * 0.05;
        baseColor = darkBrown + pattern;
        // Subtle cross-hatch
        float lines = sin(rp.x * 80.0 + rp.z * 80.0) * 0.03;
        baseColor += lines;
      } else {
        // Edge: metallic gold
        baseColor = edgeColor;
        // Coin edge ridges
        float angle = atan(rp.z, rp.x);
        float ridges = sin(angle * 60.0) * 0.04;
        baseColor += ridges;
      }

      // ── Lighting ──
      // Key light
      vec3 lightDir1 = normalize(vec3(0.5, 0.8, 0.6));
      float diff1 = max(dot(n, lightDir1), 0.0);

      // Fill light
      vec3 lightDir2 = normalize(vec3(-0.4, 0.3, 0.8));
      float diff2 = max(dot(n, lightDir2), 0.0) * 0.3;

      // Rim light
      vec3 viewDir = normalize(ro - hitP);
      float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

      // Specular
      vec3 halfDir = normalize(lightDir1 + viewDir);
      float spec1 = pow(max(dot(n, halfDir), 0.0), isEdge ? 80.0 : 40.0);

      vec3 halfDir2 = normalize(lightDir2 + viewDir);
      float spec2 = pow(max(dot(n, halfDir2), 0.0), 60.0) * 0.2;

      // Ambient
      float ambient = 0.25;

      // Compose lighting
      vec3 color = baseColor * (ambient + diff1 * 0.65 + diff2);
      color += spec1 * (isEdge ? goldLight : vec3(0.9, 0.85, 0.7)) * 0.5;
      color += spec2 * goldLight * 0.2;
      color += rim * gold * 0.15;

      // Edge gets extra shine
      if (isEdge) {
        color += spec1 * 0.3;
        color *= 1.1;
      }

      // Soft shadow on background (fake)
      float shadowDist = length(uv + vec2(0.02, -0.03));
      float coinShadow = smoothstep(0.85, 0.5, shadowDist) * 0.12;
      bg -= coinShadow;

      // ── Anti-alias edge against background ──
      // Use distance to surface for smooth blending at silhouette
      float edgeFade = smoothstep(SURF_DIST, SURF_DIST * 3.0, sceneSDF(invRot * (ro + rd * (t - 0.002))));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // ── Compile Shader ──
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // ── Quad ──
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // ── Uniforms ──
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uRotY = gl.getUniformLocation(prog, 'u_rotY');
  const uRotX = gl.getUniformLocation(prog, 'u_rotX');
  const uTexture = gl.getUniformLocation(prog, 'u_texture');
  const uTexReady = gl.getUniformLocation(prog, 'u_texReady');

  // ── Load Logo Texture ──
  let texReady = 0.0;
  const tex = gl.createTexture();

  // Set up placeholder 1x1 texture
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([133, 85, 68, 255])); // warm brown placeholder

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    // Check if power-of-2
    if ((img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    texReady = 1.0;
  };
  img.src = 'assets/Eclectic logo.jpeg';

  // ── Interaction State ──
  let autoRotY = 0;
  let autoRotSpeed = 0.6; // radians/sec
  let dragRotY = 0;
  let dragRotX = 0;
  let isDragging = false;
  let lastDragX = 0;
  let lastDragY = 0;
  let dragVelY = 0;
  let dragVelX = 0;
  let mouseX = 0.5, mouseY = 0.5;

  canvas.addEventListener('mousedown', function (e) {
    isDragging = true;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    dragVelY = 0;
    dragVelX = 0;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', function (e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = 1.0 - (e.clientY - rect.top) / rect.height;

    if (isDragging) {
      const dx = e.clientX - lastDragX;
      const dy = e.clientY - lastDragY;
      dragVelY = dx * 0.008;
      dragVelX = dy * 0.004;
      dragRotY += dragVelY;
      dragRotX += dragVelX;
      // Clamp X rotation
      dragRotX = Math.max(-0.6, Math.min(0.6, dragRotX));
      lastDragX = e.clientX;
      lastDragY = e.clientY;
    }
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }
  });

  // Touch support
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    isDragging = true;
    lastDragX = e.touches[0].clientX;
    lastDragY = e.touches[0].clientY;
    dragVelY = 0;
    dragVelX = 0;
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (isDragging && e.touches.length > 0) {
      const dx = e.touches[0].clientX - lastDragX;
      const dy = e.touches[0].clientY - lastDragY;
      dragVelY = dx * 0.008;
      dragVelX = dy * 0.004;
      dragRotY += dragVelY;
      dragRotX += dragVelX;
      dragRotX = Math.max(-0.6, Math.min(0.6, dragRotX));
      lastDragX = e.touches[0].clientX;
      lastDragY = e.touches[0].clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function () {
    isDragging = false;
  });

  canvas.style.cursor = 'grab';

  // ── Resize ──
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  // ── Render Loop ──
  let t0 = performance.now();
  let lastFrame = t0;
  let visible = false;
  let raf = null;

  function render() {
    const now = performance.now();
    const dt = Math.min((now - lastFrame) * 0.001, 0.05);
    lastFrame = now;

    // Auto rotation (pauses while dragging)
    if (!isDragging) {
      autoRotY += autoRotSpeed * dt;

      // Decay drag velocity (inertia)
      dragRotY += dragVelY;
      dragVelY *= 0.95;
      dragRotX *= 0.97; // slowly return to center
      if (Math.abs(dragVelY) < 0.0001) dragVelY = 0;
    }

    resize();

    const t = (now - t0) * 0.001;
    const totalRotY = autoRotY + dragRotY;
    const totalRotX = dragRotX;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uRotY, totalRotY);
    gl.uniform1f(uRotX, totalRotX);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTexture, 0);
    gl.uniform1f(uTexReady, texReady);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (visible) {
      raf = requestAnimationFrame(render);
    }
  }

  // ── Visibility Observer ──
  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        visible = true;
        lastFrame = performance.now();
        render();
      } else {
        visible = false;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      }
    });
  }, { threshold: 0.05 });

  obs.observe(canvas);
})();
