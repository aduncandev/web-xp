/**
 * A small software 3D renderer for the OpenGL screen savers.
 *
 * Canvas 2D only: meshes are transformed on the CPU, back faces culled, and
 * faces painted back-to-front with flat shading. That is close to what the
 * originals did on the hardware of the day, and it keeps the savers running
 * anywhere the rest of the desktop does.
 */

// --- Vector / matrix ---------------------------------------------------

export const mat = {
  identity: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  multiply(a, b) {
    const o = new Array(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        o[r * 4 + c] =
          a[r * 4] * b[c] +
          a[r * 4 + 1] * b[4 + c] +
          a[r * 4 + 2] * b[8 + c] +
          a[r * 4 + 3] * b[12 + c];
      }
    }
    return o;
  },
  translate(x, y, z) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  },
  scale(x, y, z) {
    return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
  },
  rotateX(a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },
  rotateY(a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  rotateZ(a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  apply(m, p) {
    return {
      x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
      y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
      z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
    };
  },
  /** Direction transform — translation ignored, for normals. */
  applyDir(m, p) {
    return {
      x: m[0] * p.x + m[4] * p.y + m[8] * p.z,
      y: m[1] * p.x + m[5] * p.y + m[9] * p.z,
      z: m[2] * p.x + m[6] * p.y + m[10] * p.z,
    };
  },
};

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = v => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

// --- Mesh building -----------------------------------------------------

/** A mesh is { verts: [{x,y,z}], faces: [{ idx:[...], color:[r,g,b] }] }. */
export function mesh() {
  return { verts: [], faces: [] };
}

export function addFace(m, points, color) {
  const base = m.verts.length;
  points.forEach(p => m.verts.push(p));
  m.faces.push({ idx: points.map((_, i) => base + i), color });
}

/** A tube along +Z from z=0 to z=len. */
export function cylinder(radius, len, segments, color) {
  const m = mesh();
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    addFace(
      m,
      [
        { x: Math.cos(a0) * radius, y: Math.sin(a0) * radius, z: 0 },
        { x: Math.cos(a1) * radius, y: Math.sin(a1) * radius, z: 0 },
        { x: Math.cos(a1) * radius, y: Math.sin(a1) * radius, z: len },
        { x: Math.cos(a0) * radius, y: Math.sin(a0) * radius, z: len },
      ],
      color,
    );
  }
  return m;
}

export function sphere(radius, rings, segments, color) {
  const m = mesh();
  for (let r = 0; r < rings; r++) {
    const p0 = (r / rings) * Math.PI;
    const p1 = ((r + 1) / rings) * Math.PI;
    for (let s = 0; s < segments; s++) {
      const t0 = (s / segments) * Math.PI * 2;
      const t1 = ((s + 1) / segments) * Math.PI * 2;
      const at = (p, t) => ({
        x: radius * Math.sin(p) * Math.cos(t),
        y: radius * Math.cos(p),
        z: radius * Math.sin(p) * Math.sin(t),
      });
      addFace(m, [at(p0, t0), at(p0, t1), at(p1, t1), at(p1, t0)], color);
    }
  }
  return m;
}

/**
 * A quarter-bend joining a pipe arriving along `a` to one leaving along `b`
 * (both unit and perpendicular). The centreline is the quarter circle from
 * -a*bend to +b*bend, so the tube meets the straight runs exactly.
 */
export function elbowBetween(a, b, radius, bend, segments, arcSegments, color) {
  const m = mesh();
  const C = {
    x: -a.x * bend + b.x * bend,
    y: -a.y * bend + b.y * bend,
    z: -a.z * bend + b.z * bend,
  };
  // Constant normal of the bend plane, and the in-plane cross-section axis
  const n1 = norm(cross(a, b));
  const at = (t, ang) => {
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const centre = {
      x: C.x + bend * (-b.x * ct + a.x * st),
      y: C.y + bend * (-b.y * ct + a.y * st),
      z: C.z + bend * (-b.z * ct + a.z * st),
    };
    const T = norm({
      x: a.x * ct + b.x * st,
      y: a.y * ct + b.y * st,
      z: a.z * ct + b.z * st,
    });
    const n2 = cross(T, n1);
    const ca = Math.cos(ang) * radius;
    const sa = Math.sin(ang) * radius;
    return {
      x: centre.x + n1.x * ca + n2.x * sa,
      y: centre.y + n1.y * ca + n2.y * sa,
      z: centre.z + n1.z * ca + n2.z * sa,
    };
  };
  for (let i = 0; i < arcSegments; i++) {
    const t0 = (i / arcSegments) * (Math.PI / 2);
    const t1 = ((i + 1) / arcSegments) * (Math.PI / 2);
    for (let s2 = 0; s2 < segments; s2++) {
      const g0 = (s2 / segments) * Math.PI * 2;
      const g1 = ((s2 + 1) / segments) * Math.PI * 2;
      addFace(m, [at(t0, g0), at(t0, g1), at(t1, g1), at(t1, g0)], color);
    }
  }
  return m;
}

export function box(w, h, d, color) {
  const m = mesh();
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const v = [
    { x: -x, y: -y, z: -z },
    { x: x, y: -y, z: -z },
    { x: x, y: y, z: -z },
    { x: -x, y: y, z: -z },
    { x: -x, y: -y, z: z },
    { x: x, y: -y, z: z },
    { x: x, y: y, z: z },
    { x: -x, y: y, z: z },
  ];
  const quads = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [0, 4, 7, 3],
  ];
  quads.forEach(q =>
    addFace(
      m,
      q.map(i => v[i]),
      color,
    ),
  );
  return m;
}

// --- Scene / renderer --------------------------------------------------

// The light sits up and to the left on the viewer's side of the scene —
// the eye looks down +Z, so a face turned to the viewer has a -Z normal
// and must be the lit one.
const LIGHT = norm({ x: -0.4, y: 0.7, z: -0.6 });

/**
 * Collects transformed faces from every mesh, then paints them back to
 * front. `fov` is the focal length in pixels at unit distance.
 */
export function createRenderer() {
  let faces = [];

  return {
    begin() {
      faces = [];
    },
    /** Queue a mesh under a model matrix. */
    add(m, model) {
      const verts = m.verts.map(p => mat.apply(model, p));
      const vnorms = m.vnormals
        ? m.vnormals.map(n => norm(mat.applyDir(model, n)))
        : null;
      for (const f of m.faces) {
        const pts = f.idx.map(i => verts[i]);
        // Everything behind the camera plane is dropped whole; the savers
        // keep their geometry well in front of it.
        if (pts.some(p => p.z <= 0.05)) continue;
        let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
        // Back-face cull: the eye sits at the origin looking down +Z. A
        // two-sided mesh (a surface that folds through itself, like the
        // FlowerBox) keeps its back faces and is lit as seen.
        const away = dot(n, pts[0]) > 0;
        if (away && !m.twoSided) continue;
        let z = 0;
        for (const p of pts) z += p.z;
        let vn = vnorms ? f.idx.map(i => vnorms[i]) : null;
        if (away) {
          n = { x: -n.x, y: -n.y, z: -n.z };
          if (vn) vn = vn.map(v => ({ x: -v.x, y: -v.y, z: -v.z }));
        }
        faces.push({
          pts,
          n,
          vn,
          color: f.color,
          z: z / pts.length,
          spec: m.specular || 0,
        });
      }
    },
    /** Paint everything queued, farthest first. */
    end(ctx, W, H, fov) {
      faces.sort((a, b) => b.z - a.z);
      const cx = W / 2;
      const cy = H / 2;
      const tone = (color, shade, spec = 0) => {
        const [r, g, b] = color;
        // a specular term whitens rather than brightens the colour
        const w = spec * 255;
        return `rgb(${Math.min(255, Math.round(r * shade + w))},${Math.min(
          255,
          Math.round(g * shade + w),
        )},${Math.min(255, Math.round(b * shade + w))})`;
      };
      // Blinn-Phong highlight for a normal, with the light and the eye
      // (down -Z from the origin) — only meshes that ask for it get one
      const gloss = (n, amount) => {
        if (!amount) return 0;
        const h = norm({ x: LIGHT.x, y: LIGHT.y, z: LIGHT.z - 1 });
        return amount * Math.pow(Math.max(0, dot(n, h)), 30);
      };
      for (const f of faces) {
        const screen = f.pts.map(p => {
          const s = fov / p.z;
          return { x: cx + p.x * s, y: cy - p.y * s };
        });
        ctx.beginPath();
        screen.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
        );
        ctx.closePath();

        if (f.vn) {
          // Smooth shading: light each corner, then run a gradient between
          // the brightest and darkest of them across the face.
          const shades = f.vn.map(
            n => 0.25 + Math.max(0, dot(n, LIGHT)) * 0.75,
          );
          const specs = f.vn.map(n => gloss(n, f.spec));
          let lo = 0;
          let hi = 0;
          shades.forEach((sh, i) => {
            if (sh + specs[i] < shades[lo] + specs[lo]) lo = i;
            if (sh + specs[i] > shades[hi] + specs[hi]) hi = i;
          });
          if (lo !== hi) {
            const grad = ctx.createLinearGradient(
              screen[lo].x,
              screen[lo].y,
              screen[hi].x,
              screen[hi].y,
            );
            grad.addColorStop(0, tone(f.color, shades[lo], specs[lo]));
            grad.addColorStop(1, tone(f.color, shades[hi], specs[hi]));
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = tone(f.color, shades[0], specs[0]);
          }
        } else {
          // Flat shading, one tone per facet
          ctx.fillStyle = tone(
            f.color,
            0.25 + Math.max(0, dot(f.n, LIGHT)) * 0.75,
            gloss(f.n, f.spec),
          );
        }
        ctx.fill();
        // a hairline stroke in the same paint closes the anti-aliased seams
        // between neighbouring facets that otherwise read as a grid
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    },
    get count() {
      return faces.length;
    },
  };
}

/**
 * Draws an offscreen canvas into an arbitrary projected quad by splitting it
 * into two affinely-mapped triangles. Used for the textured surfaces (3D
 * Text, the flag) that would otherwise need a real texture unit.
 */
export function drawTexturedQuad(ctx, img, quad, uv) {
  const tri = (a, b, c, ua, ub, uc) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.clip();
    // Solve the affine map taking the uv triangle onto the screen triangle
    const dx1 = ub.x - ua.x;
    const dy1 = ub.y - ua.y;
    const dx2 = uc.x - ua.x;
    const dy2 = uc.y - ua.y;
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) > 1e-6) {
      const px1 = b.x - a.x;
      const py1 = b.y - a.y;
      const px2 = c.x - a.x;
      const py2 = c.y - a.y;
      const m11 = (px1 * dy2 - px2 * dy1) / det;
      const m12 = (py1 * dy2 - py2 * dy1) / det;
      const m21 = (px2 * dx1 - px1 * dx2) / det;
      const m22 = (py2 * dx1 - py1 * dx2) / det;
      ctx.transform(
        m11,
        m12,
        m21,
        m22,
        a.x - m11 * ua.x - m21 * ua.y,
        a.y - m12 * ua.x - m22 * ua.y,
      );
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();
  };
  tri(quad[0], quad[1], quad[2], uv[0], uv[1], uv[2]);
  tri(quad[0], quad[2], quad[3], uv[0], uv[2], uv[3]);
}

export const v3 = { sub, cross, dot, norm };
