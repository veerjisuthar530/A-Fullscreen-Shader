import { useEffect, useRef } from "react";

/**
 * ShaderHero
 * -----------------------------------------------------------------------
 * Fullscreen WebGL aurora hero. Drop this at the top of your page and put
 * real content (headline, etc.) as `children` — it renders on top of the
 * canvas, positioned with CSS, not inside the GL context.
 *
 * Usage:
 *   <ShaderHero>
 *     <p className="eyebrow">// learning in public</p>
 *     <h1>Your headline</h1>
 *     <p className="sub">One-line intro.</p>
 *   </ShaderHero>
 *
 * See shader-notes.md for a block-by-block explanation of the GLSL —
 * the shader source below is intentionally identical to that file so
 * you only have to understand it once.
 * -----------------------------------------------------------------------
 */
export default function ShaderHero({ children, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });

    // No WebGL support: leave the canvas empty, let the CSS fallback
    // gradient (see .shader-hero.no-webgl below) show through instead.
    if (!gl) {
      canvas.parentElement.classList.add("no-webgl");
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const vertexSrc = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSrc = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_staticFrame;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv;
        p.x *= u_resolution.x / u_resolution.y;

        vec2 mouseUv = u_mouse;
        mouseUv.x *= u_resolution.x / u_resolution.y;

        float distToMouse = length(p - mouseUv);
        vec2 pull = normalize(mouseUv - p + 0.0001)
                    * smoothstep(0.55, 0.0, distToMouse) * 0.18;
        vec2 q = p + pull;

        float t = mix(u_time, 6.0, u_staticFrame) * 0.06;

        float n1 = fbm(q * 2.2 + vec2(t, t * 0.7));
        float n2 = fbm(q * 2.2 - vec2(t * 0.8, t * 0.4) + 4.7);
        float flow = fbm(q * 1.6 + vec2(n1, n2) * 1.4 + t * 0.3);

        vec3 ink    = vec3(0.039, 0.055, 0.102);
        vec3 cobalt = vec3(0.086, 0.227, 0.420);
        vec3 lime   = vec3(0.784, 1.000, 0.302);
        vec3 gold   = vec3(0.941, 0.706, 0.161);

        vec3 col = mix(ink, cobalt, smoothstep(0.15, 0.65, flow));
        col = mix(col, lime, smoothstep(0.55, 0.9, n2) * 0.6);
        col += gold * smoothstep(0.88, 1.0, n1) * 0.5;

        float topDarken = smoothstep(0.0, 0.7, uv.y);
        col *= mix(0.5, 1.0, topDarken);

        float grain = hash(uv * u_resolution.xy + u_time * 41.0) - 0.5;
        col += grain * 0.03;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compile(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_mouse = gl.getUniformLocation(program, "u_mouse");
    const u_staticFrame = gl.getUniformLocation(program, "u_staticFrame");

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let mouseTarget = { x: 0.5, y: 0.5 };
    let mouseSmooth = { x: 0.5, y: 0.5 };
    let rafId = null;

    function resize() {
      const w = Math.floor(canvas.clientWidth * DPR);
      const h = Math.floor(canvas.clientHeight * DPR);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseTarget.x = (e.clientX - rect.left) / rect.width;
      mouseTarget.y = 1.0 - (e.clientY - rect.top) / rect.height;
    }

    function draw(timeSeconds) {
      resize();
      mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.06;
      mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.06;

      gl.uniform2f(u_resolution, canvas.width, canvas.height);
      gl.uniform1f(u_time, timeSeconds);
      gl.uniform2f(u_mouse, mouseSmooth.x, mouseSmooth.y);
      gl.uniform1f(u_staticFrame, prefersReducedMotion ? 1.0 : 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(tMs) {
      draw(tMs / 1000);
      rafId = requestAnimationFrame(loop);
    }
    function start() {
      if (rafId === null) rafId = requestAnimationFrame(loop);
    }
    function stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    window.addEventListener("resize", resize);

    function onVisibilityChange() {
      if (document.hidden) stop();
      else if (!prefersReducedMotion) start();
    }

    if (prefersReducedMotion) {
      resize();
      draw(0); // one static frame, no loop, no mouse tracking
    } else {
      canvas.addEventListener("pointermove", onPointerMove);
      document.addEventListener("visibilitychange", onVisibilityChange);
      start();
    }

    // Cleanup on unmount: stop the loop and drop listeners so this
    // doesn't leak when the hero unmounts (route change, etc.)
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <section className={`shader-hero ${className}`}>
      <canvas ref={canvasRef} className="shader-hero__canvas" />
      <div className="shader-hero__content">{children}</div>
    </section>
  );
}
