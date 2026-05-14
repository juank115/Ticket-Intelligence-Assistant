/**
 * Wallpaper.jsx — Full-viewport interactive WebGL shader background.
 *
 * Props:
 *   shaderKey  'plasma' | 'aurora' | 'voronoi' | 'neon' | 'mercury'
 *   showHud    boolean  (default false) — overlay shader name + tagline
 *   style      CSSProperties passed to the wrapper div
 *
 * Usage:
 *   <Wallpaper shaderKey="plasma" />
 */

import { useEffect, useRef } from 'react';
import { SHADERS, VERT_SRC } from './shaders.js';

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[Wallpaper] shader compile error:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

export default function Wallpaper({ shaderKey = 'plasma', showHud = false, style }) {
  const wrapRef  = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const def = SHADERS[shaderKey];
    if (!def) { console.warn('[Wallpaper] unknown shaderKey:', shaderKey); return; }

    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    const gl     = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) { console.warn('[Wallpaper] WebGL unavailable'); return; }

    // ── Compile & link ─────────────────────────────────────────────────────
    const vs  = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
    const fs  = compileShader(gl, gl.FRAGMENT_SHADER, def.frag);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[Wallpaper] link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // ── Fullscreen quad ────────────────────────────────────────────────────
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // ── Uniform locations ──────────────────────────────────────────────────
    const u = {
      time:   gl.getUniformLocation(prog, 'u_time'),
      res:    gl.getUniformLocation(prog, 'u_res'),
      mouse:  gl.getUniformLocation(prog, 'u_mouse'),
      mt:     gl.getUniformLocation(prog, 'u_mTarget'),
      clicks: gl.getUniformLocation(prog, 'u_clicks'),
    };

    // ── Runtime state (ref — no re-renders) ───────────────────────────────
    const st = {
      mouse:       [0, 0],
      mouseTarget: [0, 0],
      clicks:      [],
      startTime:   performance.now() / 1000,
      raf:         0,
      w: 0, h: 0,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    };

    // ── Resize ─────────────────────────────────────────────────────────────
    function resize() {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width  * st.dpr));
      const h = Math.max(1, Math.round(r.height * st.dpr));
      if (w === st.w && h === st.h) return;
      st.w = w; st.h = h;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (st.mouse[0] === 0 && st.mouse[1] === 0) {
        st.mouse       = [w * 0.5, h * 0.5];
        st.mouseTarget = [w * 0.5, h * 0.5];
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── Pointer events ─────────────────────────────────────────────────────
    function setPointer(e) {
      const r = wrap.getBoundingClientRect();
      st.mouseTarget = [
        (e.clientX - r.left) * st.dpr,
        (r.height - (e.clientY - r.top)) * st.dpr,
      ];
    }
    function onDown(e) {
      setPointer(e);
      const now = performance.now() / 1000 - st.startTime;
      st.clicks.push({ x: st.mouseTarget[0], y: st.mouseTarget[1], t: now });
      while (st.clicks.length > 8) st.clicks.shift();
    }
    // Use document-level events so pointer-events:none on the wrapper
    // doesn't break mouse tracking — the shader reacts to the global cursor.
    document.addEventListener('pointermove', setPointer);
    document.addEventListener('pointerdown', onDown);

    // ── RAF loop ───────────────────────────────────────────────────────────
    const clickBuf = new Float32Array(8 * 4);
    function tick() {
      const k = 0.18;
      st.mouse[0] += (st.mouseTarget[0] - st.mouse[0]) * k;
      st.mouse[1] += (st.mouseTarget[1] - st.mouse[1]) * k;

      const now = performance.now() / 1000 - st.startTime;
      st.clicks = st.clicks.filter(c => now - c.t < 10);
      clickBuf.fill(0);
      for (let i = 0; i < st.clicks.length && i < 8; i++) {
        const c = st.clicks[i];
        clickBuf[i*4]   = c.x;
        clickBuf[i*4+1] = c.y;
        clickBuf[i*4+2] = c.t;
        clickBuf[i*4+3] = 1.0;
      }

      gl.uniform1f(u.time,  now);
      gl.uniform2f(u.res,   st.w, st.h);
      gl.uniform2f(u.mouse, st.mouse[0], st.mouse[1]);
      gl.uniform2f(u.mt,    st.mouseTarget[0], st.mouseTarget[1]);
      gl.uniform4fv(u.clicks, clickBuf);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      st.raf = requestAnimationFrame(tick);
    }
    st.raf = requestAnimationFrame(tick);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(st.raf);
      ro.disconnect();
      document.removeEventListener('pointermove', setPointer);
      document.removeEventListener('pointerdown', onDown);
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    };
  }, [shaderKey]);

  const def = SHADERS[shaderKey];

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: '#04010a',
        pointerEvents: 'none',   // content above handles all events
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
      />
      {showHud && def && (
        <div style={{
          position: 'absolute', left: 24, bottom: 20,
          color: 'rgba(255,255,255,0.85)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
          pointerEvents: 'none', mixBlendMode: 'plus-lighter',
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: 12, letterSpacing: '0.26em', marginBottom: 3 }}>{def.name}</div>
          <div style={{ opacity: 0.55 }}>{def.tagline}</div>
        </div>
      )}
    </div>
  );
}

export { SHADERS };
