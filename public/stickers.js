/*
 * Retro vinyl stickers, rendered as if physically stuck on the page.
 * Each sticker is an inline SVG run through one filter chain:
 *   die-cut white border (dilate) -> ripple warp (displacement) ->
 *   wrinkle shading (diffuse light) + moving gloss (specular light).
 * The gloss follows the pointer (or the scroll on touch). Stickers slap on
 * after the intro and can be dragged around. Reduced motion: placed, still.
 */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = { ink: "#141413", cream: "#f6efdd", orange: "#e8572b", mustard: "#f2b632", teal: "#2b7a78", white: "#fbfaf6" };

  const burst = (cx, cy, n, r1, r2) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const r = i % 2 ? r2 : r1;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  // Designs: viewBox 0 0 w h, drawn inside a margin so the die-cut border fits.
  const DESIGNS = {
    years: {
      w: 150, h: 150,
      svg: `<polygon points="${burst(75, 75, 16, 62, 52)}" fill="${C.mustard}"/>
        <circle cx="75" cy="75" r="44" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="3 5"/>
        <text x="75" y="77" text-anchor="middle" font-family="Shrikhand, serif" font-size="38" textLength="66" lengthAdjust="spacingAndGlyphs" fill="${C.ink}">10+</text>
        <text x="75" y="100" text-anchor="middle" font-family="'Archivo Black', sans-serif" font-size="15" letter-spacing="2" fill="${C.ink}">YEARS</text>`,
    },
    badge: {
      w: 150, h: 150,
      svg: `<defs><path id="arc-{id}" d="M75,75 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0"/></defs>
        <circle cx="75" cy="75" r="62" fill="${C.ink}"/>
        <circle cx="75" cy="75" r="56" fill="none" stroke="${C.cream}" stroke-width="1.5"/>
        <text font-family="'Archivo Black', sans-serif" font-size="11" fill="${C.cream}">
          <textPath href="#arc-{id}" textLength="290" lengthAdjust="spacingAndGlyphs">CREATIVE SYSTEMS · AI STRATEGY · FOR BRANDS · </textPath></text>
        <circle cx="75" cy="75" r="30" fill="${C.orange}"/>
        <text x="75" y="85" text-anchor="middle" font-family="'Inter Tight', sans-serif" font-weight="800" font-size="27" letter-spacing="-2" fill="${C.cream}">®®</text>`,
    },
    invite: {
      w: 190, h: 76,
      svg: `<path d="M14,10 H176 a6,6 0 0 1 6,6 v12 a10,10 0 0 0 0,20 v12 a6,6 0 0 1 -6,6 H14 a6,6 0 0 1 -6,-6 v-12 a10,10 0 0 0 0,-20 v-12 a6,6 0 0 1 6,-6 z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5"/>
        <line x1="38" y1="16" x2="38" y2="60" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="3 3"/>
        <text x="23" y="43" text-anchor="middle" font-family="'Archivo Black', sans-serif" font-size="12" fill="${C.orange}">★</text>
        <text x="108" y="37" text-anchor="middle" font-family="'Archivo Black', sans-serif" font-size="19" textLength="118" lengthAdjust="spacingAndGlyphs" fill="${C.ink}">INVITE ONLY</text>
        <text x="108" y="55" text-anchor="middle" font-family="'Inter Tight', sans-serif" font-weight="700" font-size="11" textLength="104" lengthAdjust="spacingAndGlyphs" fill="${C.ink}">3 FOUNDING SPOTS</text>`,
    },
    brands: {
      w: 176, h: 92,
      svg: `<rect x="8" y="8" width="160" height="76" rx="38" fill="${C.orange}"/>
        <rect x="15" y="15" width="146" height="62" rx="31" fill="none" stroke="${C.cream}" stroke-width="2"/>
        <text x="88" y="55" text-anchor="middle" font-family="Shrikhand, serif" font-size="28" textLength="118" lengthAdjust="spacingAndGlyphs" fill="${C.cream}">50+ brands</text>`,
    },
    hello: {
      w: 132, h: 104,
      svg: `<path d="M18,10 H114 a12,12 0 0 1 12,12 V62 a12,12 0 0 1 -12,12 H56 L34,94 L38,74 H18 a12,12 0 0 1 -12,-12 V22 a12,12 0 0 1 12,-12 z" fill="${C.teal}"/>
        <text x="66" y="53" text-anchor="middle" font-family="Shrikhand, serif" font-size="27" textLength="88" lengthAdjust="spacingAndGlyphs" fill="${C.cream}">say hi</text>`,
    },
  };

  // Where each sticker goes (anchored to a page element) and how it sits.
  const PLACES = [
    { id: "years", anchor: ".hero", width: 86, rot: -12, style: { left: "-8px", top: "62%" } },
    { id: "badge", anchor: ".hero", width: 88, rot: 9, style: { right: "-6px", top: "8px" } },
    { id: "invite", anchor: ".links-top", width: 118, rot: 6, style: { right: "-6px", top: "-24px" } },
    { id: "hello", anchor: ".section", width: 86, rot: -8, style: { right: "8px", top: "-34px" } },
    { id: "brands", anchor: ".mark", width: 128, rot: -7, style: { left: "20px", top: "6px" } },
  ];

  const filterFor = (id, seed) => `
    <filter id="f-${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="cut"/>
      <feFlood flood-color="${C.white}"/>
      <feComposite in2="cut" operator="in" result="border"/>
      <feMerge result="vinyl"><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge>
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="2" seed="${seed}" result="warp"/>
      <feDisplacementMap class="ripple" in="vinyl" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="rippled"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="3" seed="${seed + 7}" result="bump"/>
      <feDiffuseLighting in="bump" surfaceScale="2.4" diffuseConstant="1.22" lighting-color="#ffffff" result="diffuse">
        <feDistantLight azimuth="235" elevation="58"/>
      </feDiffuseLighting>
      <feComposite in="diffuse" in2="rippled" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="shaded"/>
      <feSpecularLighting in="bump" surfaceScale="3.2" specularConstant="0.95" specularExponent="22" lighting-color="#ffffff" result="gloss">
        <fePointLight class="light" x="-30" y="-40" z="140"/>
      </feSpecularLighting>
      <feComposite in="gloss" in2="rippled" operator="in" result="glossIn"/>
      <feComposite in="shaded" in2="glossIn" operator="arithmetic" k1="0" k2="1" k3="0.42" k4="0" result="lit"/>
      <feComposite in="lit" in2="rippled" operator="in"/>
    </filter>`;

  const stickers = [];
  PLACES.forEach((p, i) => {
    const d = DESIGNS[p.id];
    const anchor = document.querySelector(p.anchor);
    if (!d || !anchor) return;
    anchor.classList.add("has-stickers");
    const wrap = document.createElement("div");
    wrap.className = "sticker";
    wrap.style.width = `${p.width}px`;
    Object.assign(wrap.style, p.style);
    wrap.style.setProperty("--rot", `${p.rot}deg`);
    wrap.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${d.w} ${d.h}`);
    svg.innerHTML = `<defs>${filterFor(p.id, 3 + i * 11)}</defs><g filter="url(#f-${p.id})">${d.svg.replaceAll("{id}", p.id)}</g>`;
    wrap.appendChild(svg);
    anchor.appendChild(wrap);
    stickers.push({ el: wrap, svg, w: d.w, h: d.h, light: svg.querySelector(".light"), ripple: svg.querySelector(".ripple"), dx: 0, dy: 0 });
  });

  // Gloss follows the pointer; on touch, the scroll moves the light instead.
  const aim = (x, y) => {
    for (const s of stickers) {
      const r = s.el.getBoundingClientRect();
      if (!r.width) continue;
      const lx = ((x - r.left) / r.width) * s.w;
      const ly = ((y - r.top) / r.height) * s.h;
      s.light.setAttribute("x", lx.toFixed(1));
      s.light.setAttribute("y", ly.toFixed(1));
    }
  };
  let raf = 0;
  const queue = (x, y) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => aim(x, y));
  };
  addEventListener("pointermove", (e) => e.pointerType === "mouse" && queue(e.clientX, e.clientY), { passive: true });
  const fromScroll = () => queue(innerWidth * 0.25 + (scrollY % 400) * 0.6, scrollY * 0.15 % innerHeight);
  addEventListener("scroll", fromScroll, { passive: true });
  fromScroll();

  // Ripple settles after the slap: displacement eases from strong to resting.
  const settle = (s, from = 14, to = 2.6, ms = 360) => {
    if (reduce) return;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      s.ripple.setAttribute("scale", (from + (to - from) * e).toFixed(2));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Slap on, one by one, after the page intro.
  stickers.forEach((s, i) => {
    if (reduce) {
      s.el.classList.add("stuck");
      return;
    }
    setTimeout(() => {
      s.el.classList.add("stuck");
      settle(s);
    }, 700 + i * 160);
  });

  // Drag to rearrange. A tap without moving gives a small press.
  for (const s of stickers) {
    let start = null;
    s.el.addEventListener("pointerdown", (e) => {
      start = { x: e.clientX, y: e.clientY, dx: s.dx, dy: s.dy, moved: false };
      s.el.setPointerCapture(e.pointerId);
      s.el.classList.add("lifted");
      s.ripple.setAttribute("scale", "7");
    });
    s.el.addEventListener("pointermove", (e) => {
      if (!start) return;
      const mx = e.clientX - start.x;
      const my = e.clientY - start.y;
      if (!start.moved && Math.hypot(mx, my) < 4) return;
      start.moved = true;
      s.dx = start.dx + mx;
      s.dy = start.dy + my;
      s.el.style.setProperty("--dx", `${s.dx}px`);
      s.el.style.setProperty("--dy", `${s.dy}px`);
    });
    const drop = () => {
      if (!start) return;
      start = null;
      s.el.classList.remove("lifted");
      settle(s, 8, 2.6, 280);
    };
    s.el.addEventListener("pointerup", drop);
    s.el.addEventListener("pointercancel", drop);
  }
})();
