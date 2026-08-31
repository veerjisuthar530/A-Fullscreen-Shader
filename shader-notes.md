# Signature Hero — shader notes

## What it is
A fullscreen aurora-style flow field, rendered with raw WebGL1 (no three.js,
no dependencies) as the hero behind a headline. Remixed from the session's
aurora-gradient playground: same domain-warped-fbm technique, but a new
palette (ink / cobalt / lime / gold instead of teal/purple), a mouse-pull
term added to the flow field, a grain pass, and a contrast band for the
text — none of that was in the original.

## The uv / time / mouse mental model
- **uv** — where on the screen this pixel is, as a 0–1 coordinate. Everything
  the shader draws is computed *per pixel*, independently, in parallel. There's
  no "canvas" object to draw shapes onto — you're answering "what color is
  *this* pixel" 2 million times a frame.
- **u_time** — a single number, seconds since start, sent in fresh every
  frame. Any GLSL expression that includes `u_time` will animate; anything
  that doesn't, won't. That's the whole animation model.
- **u_mouse** — cursor position as 0–1, same coordinate space as uv. Compare
  a pixel's uv to u_mouse and you know how close that pixel is to the cursor
  — which is all "mouse interaction" is in a shader: a distance check.

## Block-by-block (mirrors the comments in the code)

1. **`hash()`** — turns a 2D point into a pseudo-random 0–1 number. Nothing
   below works without this; it's the source of all the "randomness."
2. **`noise()`** — samples `hash()` at the 4 corners of a grid cell and
   blends between them (smoothstep-eased), so nearby points get similar
   values. This is what turns static into smooth blobs.
3. **`fbm()`** — runs `noise()` five times at shrinking scale and weight and
   sums the results. One noise() call looks like one blob; fbm() layered on
   top of itself looks like clouds — this is the standard trick behind most
   "organic" shader backgrounds.
4. **Coordinates** — `gl_FragCoord.xy / u_resolution` converts pixels to uv;
   multiplying `x` by the aspect ratio stops the pattern from stretching on
   wide screens.
5. **Mouse influence** — direction from this pixel toward the cursor,
   scaled by `smoothstep(0.55, 0.0, distToMouse)` so it's strong near the
   cursor and zero far away, then nudges the sample point (`q`) before
   feeding it into the noise. That's the "leans toward the cursor" effect.
6. **Domain warping** — run `fbm()` twice to get two flow values (`n1`,
   `n2`), then feed *those* into a third `fbm()` call as an offset. Plain
   fbm looks like clouds; fbm warped by fbm is what produces the curled
   ribbon shapes an aurora actually has.
7. **Palette** — four fixed colors mixed by `smoothstep()` thresholds
   against the flow/noise values. This is the one section that's pure
   creative choice — swap these four `vec3`s and the whole piece changes
   mood without touching the math above it.
8. **Contrast band** — darkens the top ~70% → 0% of the frame with a
   vertical `smoothstep`, so headline text sitting up there stays readable
   without a flat overlay `<div>` on top of the canvas.
9. **Grain** — one more `hash()` call, reseeded by `u_time` so it flickers
   frame to frame, added at low amplitude. Breaks up color banding and
   reads as film grain instead of a smooth CSS gradient.

## Reduced-motion / performance, one-liner
`devicePixelRatio` is capped at 2, the `requestAnimationFrame` loop is
cancelled on `visibilitychange` when the tab is hidden, and
`prefers-reduced-motion: reduce` skips the animation loop and mouse
tracking entirely, rendering one still frame (`u_staticFrame` freezes time
at a fixed value) instead of a moving gradient.

## Files
- `signature-hero-demo.html` — standalone, open-in-browser demo (what's
  rendered in the artifact preview).
- `ShaderHero.jsx` + `ShaderHero.css` — the React version, same shader,
  wired for mount/unmount cleanup, drop into the existing site.
