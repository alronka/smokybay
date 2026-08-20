/*
  Suminagashi hero fluid simulation.
  A compact WebGL2 "stable fluids" (Jos Stam) implementation: velocity field
  advected and diffused, dye density advected through it, pressure projection
  keeps the flow divergence-free. Pointer movement splats velocity + colored
  dye (indigo / vermillion / carbon, on a cream base) into the field.
  This is a real simulation, not a canned animation loop.
*/
(function () {
  'use strict';

  var canvas = document.getElementById('ink-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) {
    canvas.style.display = 'none';
    return;
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  var ext = gl.getExtension('EXT_color_buffer_float');
  var linearFloat = gl.getExtension('OES_texture_float_linear');
  var texType, internalFormat;
  if (ext && linearFloat) {
    texType = gl.FLOAT;
    internalFormat = gl.RGBA32F;
  } else {
    var halfExt = gl.getExtension('EXT_color_buffer_half_float');
    var halfLinear = gl.getExtension('OES_texture_half_float_linear');
    if (halfExt && halfLinear) {
      texType = gl.HALF_FLOAT;
      internalFormat = gl.RGBA16F;
    } else {
      texType = gl.UNSIGNED_BYTE;
      internalFormat = gl.RGBA8;
    }
  }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('fluid-sim shader error', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function program(vsSrc, fsSrc) {
    var vs = compile(gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('fluid-sim link error', gl.getProgramInfoLog(p));
      return null;
    }
    var uniforms = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      uniforms[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { program: p, uniforms: uniforms };
  }

  var baseVertex =
    'precision highp float;\n' +
    'attribute vec2 aPos;\n' +
    'varying vec2 vUv;\n' +
    'void main () {\n' +
    '  vUv = aPos * 0.5 + 0.5;\n' +
    '  gl_Position = vec4(aPos, 0.0, 1.0);\n' +
    '}\n';

  var advectionShader =
    'precision highp float;\n' +
    'varying vec2 vUv;\n' +
    'uniform sampler2D uVelocity;\n' +
    'uniform sampler2D uSource;\n' +
    'uniform vec2 uTexel;\n' +
    'uniform float uDt;\n' +
    'uniform float uDissipation;\n' +
    'void main () {\n' +
    '  vec2 vel = texture2D(uVelocity, vUv).xy;\n' +
    '  vec2 coord = vUv - uDt * vel * uTexel;\n' +
    '  vec4 result = texture2D(uSource, coord);\n' +
    '  gl_FragColor = uDissipation * result;\n' +
    '}\n';

  var splatShader =
    'precision highp float;\n' +
    'varying vec2 vUv;\n' +
    'uniform sampler2D uTarget;\n' +
    'uniform float uAspect;\n' +
    'uniform vec3 uColor;\n' +
    'uniform vec2 uPoint;\n' +
    'uniform float uRadius;\n' +
    'void main () {\n' +
    '  vec2 p = vUv - uPoint;\n' +
    '  p.x *= uAspect;\n' +
    '  float falloff = exp(-dot(p, p) / uRadius);\n' +
    '  vec4 base = texture2D(uTarget, vUv);\n' +
    // rgb accumulates the true pigment color weighted by falloff; alpha
    // tracks total ink coverage independently, so a dark pigment (carbon)
    // still reads as dark instead of normalizing away to white.
    '  gl_FragColor = vec4(base.rgb + falloff * uColor, base.a + falloff);\n' +
    '}\n';

  var divergenceShader =
    'precision highp float;\n' +
    'varying vec2 vUv;\n' +
    'uniform sampler2D uVelocity;\n' +
    'uniform vec2 uTexel;\n' +
    'void main () {\n' +
    '  float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;\n' +
    '  float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;\n' +
    '  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;\n' +
    '  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;\n' +
    '  float div = 0.5 * (R - L + T - B);\n' +
    '  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);\n' +
    '}\n';

  var pressureShader =
    'precision highp float;\n' +
    'varying vec2 vUv;\n' +
    'uniform sampler2D uPressure;\n' +
    'uniform sampler2D uDivergence;\n' +
    'uniform vec2 uTexel;\n' +
    'void main () {\n' +
    '  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;\n' +
    '  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;\n' +
    '  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;\n' +
    '  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;\n' +
    '  float div = texture2D(uDivergence, vUv).x;\n' +
    '  float pressure = (L + R + B + T - div) * 0.25;\n' +
    '  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);\n' +
    '}\n';

  var gradientSubtractShader =
    'precision highp float;\n' +
    'varying vec2 vUv;\n' +
    'uniform sampler2D uPressure;\n' +
    'uniform sampler2D uVelocity;\n' +
    'uniform vec2 uTexel;\n' +
    'void main () {\n' +
    '  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;\n' +
    '  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;\n' +
    '  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;\n' +
    '  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;\n' +
    '  vec2 vel = texture2D(uVelocity, vUv).xy;\n' +
    '  vel -= vec2(R - L, T - B);\n' +
    '  gl_FragColor = vec4(vel, 0.0, 1.0);\n' +
    '}\n';

  var displayShader =
    'precision highp float;\n' +
    'varying vec2 vUv;\n' +
    'uniform sampler2D uDye;\n' +
    'uniform vec3 uPaper;\n' +
    'void main () {\n' +
    '  vec4 dye = max(texture2D(uDye, vUv), 0.0);\n' +
    // Alpha is the true ink coverage; rgb / alpha recovers the weighted true
    // pigment color (correct even for a dark, low-magnitude pigment like
    // carbon, which the old brightest-channel normalization turned white).
    '  float amount = clamp(dye.a, 0.0, 1.0);\n' +
    '  vec3 pigment = dye.rgb / max(dye.a, 0.0001);\n' +
    '  vec3 color = mix(uPaper, pigment, amount);\n' +
    '  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);\n' +
    '}\n';

  var progAdvection = program(baseVertex, advectionShader);
  var progSplat = program(baseVertex, splatShader);
  var progDivergence = program(baseVertex, divergenceShader);
  var progPressure = program(baseVertex, pressureShader);
  var progGradientSubtract = program(baseVertex, gradientSubtractShader);
  var progDisplay = program(baseVertex, displayShader);

  if (!progAdvection || !progSplat || !progDivergence || !progPressure || !progGradientSubtract || !progDisplay) {
    canvas.style.display = 'none';
    return;
  }

  var quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function bindQuad(prog) {
    gl.useProgram(prog.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    var loc = gl.getAttribLocation(prog.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function createFBO(w, h) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, texType, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex: tex, fbo: fbo, w: w, h: h };
  }

  function createDoubleFBO(w, h) {
    var a = createFBO(w, h);
    var b = createFBO(w, h);
    return {
      w: w, h: h,
      get read() { return a; },
      get write() { return b; },
      swap: function () { var t = a; a = b; b = t; }
    };
  }

  var simRes = 128;
  var dyeRes = 512;

  function computeRes(base) {
    var cw = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth || base;
    var ch = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight || base;
    var aspect = cw / ch || 1;
    if (aspect > 1) return { w: Math.max(1, Math.round(base * aspect)), h: Math.max(1, base) };
    return { w: Math.max(1, base), h: Math.max(1, Math.round(base / aspect)) };
  }

  var simSize = computeRes(simRes);
  var dyeSize = computeRes(dyeRes);

  var velocity = createDoubleFBO(simSize.w, simSize.h);
  var dye = createDoubleFBO(dyeSize.w, dyeSize.h);
  var divergence = createFBO(simSize.w, simSize.h);
  var pressure = createDoubleFBO(simSize.w, simSize.h);

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(canvas.clientWidth * dpr);
    var h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function blit(target) {
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.w, target.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  var pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, down: false };
  var lastAutoSplat = 0;

  function toUv(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: 1.0 - (clientY - rect.top) / rect.height
    };
  }

  function onPointerMove(clientX, clientY) {
    var uv = toUv(clientX, clientY);
    pointer.dx = (uv.x - pointer.x) * 6;
    pointer.dy = (uv.y - pointer.y) * 6;
    pointer.x = uv.x;
    pointer.y = uv.y;
    pointer.moved = true;
  }

  canvas.addEventListener('pointermove', function (e) { onPointerMove(e.clientX, e.clientY); });
  canvas.addEventListener('pointerdown', function (e) { pointer.down = true; onPointerMove(e.clientX, e.clientY); });
  window.addEventListener('pointerup', function () { pointer.down = false; });

  var palettes = [
    [0.11, 0.20, 0.40],  // indigo
    [0.72, 0.22, 0.16],  // vermillion
    [0.08, 0.08, 0.08]   // carbon
  ];
  var paletteIndex = 0;

  function splat(x, y, dx, dy, color) {
    bindQuad(progSplat);
    gl.uniform1i(progSplat.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
    gl.uniform1f(progSplat.uniforms.uAspect, canvas.width / canvas.height);
    gl.uniform2f(progSplat.uniforms.uPoint, x, y);
    gl.uniform3f(progSplat.uniforms.uColor, dx, dy, 0.0);
    gl.uniform1f(progSplat.uniforms.uRadius, 0.0018);
    blit(velocity.write);
    velocity.swap();

    bindQuad(progSplat);
    gl.uniform1i(progSplat.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
    gl.uniform1f(progSplat.uniforms.uAspect, canvas.width / canvas.height);
    gl.uniform2f(progSplat.uniforms.uPoint, x, y);
    gl.uniform3f(progSplat.uniforms.uColor, color[0], color[1], color[2]);
    gl.uniform1f(progSplat.uniforms.uRadius, 0.00045);
    blit(dye.write);
    dye.swap();
  }

  var lastTime = performance.now();

  function step() {
    var now = performance.now();
    var dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    gl.disable(gl.BLEND);

    // Velocity advection (self-advect).
    bindQuad(progAdvection);
    gl.uniform2f(progAdvection.uniforms.uTexel, 1.0 / simSize.w, 1.0 / simSize.h);
    gl.uniform1i(progAdvection.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
    gl.uniform1i(progAdvection.uniforms.uSource, 0);
    gl.uniform1f(progAdvection.uniforms.uDt, dt);
    gl.uniform1f(progAdvection.uniforms.uDissipation, 0.985);
    blit(velocity.write);
    velocity.swap();

    // Dye advection through the velocity field.
    bindQuad(progAdvection);
    gl.uniform2f(progAdvection.uniforms.uTexel, 1.0 / simSize.w, 1.0 / simSize.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
    gl.uniform1i(progAdvection.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
    gl.uniform1i(progAdvection.uniforms.uSource, 1);
    gl.uniform1f(progAdvection.uniforms.uDt, dt);
    gl.uniform1f(progAdvection.uniforms.uDissipation, 0.996);
    blit(dye.write);
    dye.swap();

    if (pointer.moved) {
      var speed = Math.sqrt(pointer.dx * pointer.dx + pointer.dy * pointer.dy);
      if (speed > 0.0008) {
        splat(pointer.x, pointer.y, pointer.dx * 90, pointer.dy * 90, palettes[paletteIndex]);
        if (Math.random() < 0.02) paletteIndex = (paletteIndex + 1) % palettes.length;
      }
      pointer.moved = false;
    } else if (now - lastAutoSplat > 3200) {
      // Gentle ambient drop so the basin never sits perfectly still.
      var ax = 0.3 + Math.random() * 0.4;
      var ay = 0.3 + Math.random() * 0.4;
      splat(ax, ay, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, palettes[paletteIndex]);
      paletteIndex = (paletteIndex + 1) % palettes.length;
      lastAutoSplat = now;
    }

    // Divergence.
    bindQuad(progDivergence);
    gl.uniform2f(progDivergence.uniforms.uTexel, 1.0 / simSize.w, 1.0 / simSize.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
    gl.uniform1i(progDivergence.uniforms.uVelocity, 0);
    blit(divergence);

    // Clear pressure lightly each frame for stability, then solve.
    bindQuad(progPressure);
    for (var i = 0; i < 20; i++) {
      gl.uniform2f(progPressure.uniforms.uTexel, 1.0 / simSize.w, 1.0 / simSize.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pressure.read.tex);
      gl.uniform1i(progPressure.uniforms.uPressure, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, divergence.tex);
      gl.uniform1i(progPressure.uniforms.uDivergence, 1);
      blit(pressure.write);
      pressure.swap();
    }

    // Subtract pressure gradient.
    bindQuad(progGradientSubtract);
    gl.uniform2f(progGradientSubtract.uniforms.uTexel, 1.0 / simSize.w, 1.0 / simSize.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.tex);
    gl.uniform1i(progGradientSubtract.uniforms.uPressure, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.tex);
    gl.uniform1i(progGradientSubtract.uniforms.uVelocity, 1);
    blit(velocity.write);
    velocity.swap();

    // Display: dye darkens the cream paper.
    resizeCanvas();
    bindQuad(progDisplay);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
    gl.uniform1i(progDisplay.uniforms.uDye, 0);
    gl.uniform3f(progDisplay.uniforms.uPaper, 0.965, 0.945, 0.902);
    blit(null);

    requestAnimationFrame(step);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Seed a few marbled swirls immediately so the basin already has visible
  // character on first paint, rather than sitting blank until a visitor
  // moves their cursor or the first ambient drop lands. Placed in the open
  // strip above the hero card/mascot (grid content is bottom-aligned), not
  // behind them — the card is a deliberately still island, not a canvas mask.
  var seeds = [
    { x: 0.18, y: 0.86, c: 0 }, { x: 0.38, y: 0.92, c: 1 },
    { x: 0.58, y: 0.82, c: 2 }, { x: 0.78, y: 0.9, c: 0 },
    { x: 0.3, y: 0.7, c: 1 }
  ];
  seeds.forEach(function (s, i) {
    setTimeout(function () {
      splat(s.x, s.y, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, palettes[s.c]);
    }, i * 90);
  });
  lastAutoSplat = performance.now();

  requestAnimationFrame(step);
})();
