/*
 * Windows XP "3D Text" (sstext3d.scr), rebuilt on three.js.
 *
 * The original hands the chosen GDI font to D3DXCreateText, which turns the
 * glyph outlines into an extruded mesh (no bevel), so any installed font
 * works. The browser never exposes outlines, so this does the next best
 * thing: it rasterizes the text with the chosen font through Canvas 2D,
 * traces the bitmap back into closed contours, simplifies them at a
 * tolerance the Resolution slider controls (the original's "mesh quality"),
 * and extrudes those. Every option the DIALOG resource declares is honoured:
 * Time / Custom Text, Choose Font (face, bold, italic), Resolution, Size,
 * Rotation Type + Speed, Surface Style — Solid Color (custom or not),
 * Texture (the built-in bitmap or a custom one), Reflection (the built-in
 * sphere map or a custom one) — and Show Specular Highlights.
 *
 * texture.jpg and reflection.jpg are the JPG resources 102 and 103 inside
 * sstext3d.scr itself.
 */
(function() {
  var canvas = document.getElementById('c');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 34);

  // One key light from the upper left in front, plus a little ambient —
  // the extruded sides fall into shadow as the text turns, as they do in
  // the original.
  scene.add(new THREE.AmbientLight(0x303030));
  var key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(-0.5, 0.8, 1);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(0.8, -0.3, 0.5);
  scene.add(fill);

  var options = {
    useTime: false,
    text: 'Microsoft Windows',
    fontFamily: 'Tahoma',
    bold: false,
    italic: false,
    rotation: 'spin',
    speed: 10,
    size: 10,
    resolution: 10,
    surface: 'solid', // solid | texture | reflection
    customColor: false,
    color: '#c6c600',
    customTexture: false,
    textureUrl: '', // the shell resolves the chosen VFS file to a URL
    customReflection: false,
    reflectionUrl: '',
    specular: true,
  };

  // Without a custom colour the original picks one for the run
  var runColor = new THREE.Color().setHSL(Math.random(), 0.75, 0.5);

  /* ------------------------------------------------------------------ */
  /* Outlines from a bitmap                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Rasterize `label` in `font` at `px` pixels per em and trace the filled
   * region into closed loops of pixel-edge vertices. Filled pixels are kept
   * on the left of each directed edge, so outer loops and holes come out
   * with opposite winding; holes are then sorted out by nesting depth.
   */
  function traceText(label, font, px) {
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    g.font = font;
    var m = g.measureText(label);
    var pad = Math.ceil(px * 0.25);
    var w = Math.ceil(m.width) + pad * 2;
    var h = Math.ceil(px * 1.5) + pad * 2;
    c.width = w;
    c.height = h;
    g.font = font;
    g.fillStyle = '#fff';
    g.textBaseline = 'alphabetic';
    // Baseline a bit above the bottom, leaving room for descenders
    var baseY = pad + Math.round(px * 1.05);
    g.fillText(label, pad, baseY);
    var data = g.getImageData(0, 0, w, h).data;
    var W = w + 1;
    var filled = new Uint8Array(W * (h + 1));
    for (var y = 0; y < h; y++)
      for (var x = 0; x < w; x++)
        if (data[(y * w + x) * 4 + 3] >= 128) filled[y * W + x] = 1;
    var at = function(x, y) {
      return x >= 0 && y >= 0 && x < w && y < h ? filled[y * W + x] : 0;
    };

    // Directed edges on the pixel lattice, filled side on the left.
    // Keyed by start vertex (x + y*W); a vertex can start two edges where
    // pixels touch diagonally, so each slot holds a small list.
    var starts = new Map();
    var add = function(x0, y0, x1, y1) {
      var k = x0 + y0 * W;
      var e = { x0: x0, y0: y0, x1: x1, y1: y1, used: false };
      var list = starts.get(k);
      if (list) list.push(e);
      else starts.set(k, [e]);
    };
    for (var yy = 0; yy < h; yy++)
      for (var xx = 0; xx < w; xx++) {
        if (!at(xx, yy)) continue;
        if (!at(xx, yy - 1)) add(xx, yy, xx + 1, yy); // top edge, going right
        if (!at(xx + 1, yy)) add(xx + 1, yy, xx + 1, yy + 1); // right, going down
        if (!at(xx, yy + 1)) add(xx + 1, yy + 1, xx, yy + 1); // bottom, going left
        if (!at(xx - 1, yy)) add(xx, yy + 1, xx, yy); // left, going up
      }

    var loops = [];
    starts.forEach(function(list) {
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e.used) continue;
        var loop = [];
        var cur = e;
        var guard = 0;
        while (cur && !cur.used && guard++ < 4000000) {
          cur.used = true;
          loop.push([cur.x0, cur.y0]);
          var next = starts.get(cur.x1 + cur.y1 * W);
          if (!next) break;
          var pick = null;
          for (var j = 0; j < next.length; j++) {
            if (next[j].used) continue;
            // Prefer the edge that keeps turning the same way (tight
            // corners), so touching diagonals split into two loops
            if (!pick) pick = next[j];
            else {
              var dx = cur.x1 - cur.x0;
              var dy = cur.y1 - cur.y0;
              var tx = next[j].x1 - next[j].x0;
              var ty = next[j].y1 - next[j].y0;
              // cross > 0 is a right turn in y-down coordinates: hug the
              // pixel we are on rather than cross over to its neighbour
              if (dx * ty - dy * tx > 0) pick = next[j];
            }
          }
          cur = pick;
        }
        if (loop.length >= 4) loops.push(loop);
      }
    });
    return { loops: loops, w: w, h: h, baseY: baseY, pad: pad };
  }

  /** Ramer–Douglas–Peucker on a closed loop. */
  function simplify(loop, tol) {
    if (loop.length < 8) return loop;
    // Split at the two points farthest apart so both halves are open runs
    var a = 0;
    var b = 0;
    var best = -1;
    var step = Math.max(1, Math.floor(loop.length / 64));
    for (var i = 0; i < loop.length; i += step)
      for (var j = i + 1; j < loop.length; j += step) {
        var dx = loop[i][0] - loop[j][0];
        var dy = loop[i][1] - loop[j][1];
        var d = dx * dx + dy * dy;
        if (d > best) {
          best = d;
          a = i;
          b = j;
        }
      }
    var first = loop.slice(a, b + 1);
    var second = loop.slice(b).concat(loop.slice(0, a + 1));
    var out = rdp(first, tol);
    out.pop();
    var o2 = rdp(second, tol);
    o2.pop();
    return out.concat(o2);
  }
  function rdp(pts, tol) {
    if (pts.length < 3) return pts.slice();
    var ax = pts[0][0];
    var ay = pts[0][1];
    var bx = pts[pts.length - 1][0];
    var by = pts[pts.length - 1][1];
    var len = Math.hypot(bx - ax, by - ay) || 1;
    var maxD = -1;
    var idx = 0;
    for (var i = 1; i < pts.length - 1; i++) {
      var d = Math.abs(
        ((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len,
      );
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol) {
      var l = rdp(pts.slice(0, idx + 1), tol);
      var r = rdp(pts.slice(idx), tol);
      return l.slice(0, -1).concat(r);
    }
    return [pts[0], pts[pts.length - 1]];
  }

  function signedArea(loop) {
    var s = 0;
    for (var i = 0, n = loop.length; i < n; i++) {
      var p = loop[i];
      var q = loop[(i + 1) % n];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return s / 2;
  }
  function contains(loop, pt) {
    var inside = false;
    for (var i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      var xi = loop[i][0];
      var yi = loop[i][1];
      var xj = loop[j][0];
      var yj = loop[j][1];
      if (
        yi > pt[1] !== yj > pt[1] &&
        pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
      )
        inside = !inside;
    }
    return inside;
  }

  /** Closed loops → THREE.Shape list (outer loops with their holes). */
  function shapesFrom(loops, px, origin) {
    var items = loops.map(function(l) {
      return { pts: l, area: Math.abs(signedArea(l)), depth: 0, holes: [] };
    });
    items.sort(function(a, b) {
      return b.area - a.area;
    });
    for (var i = 0; i < items.length; i++) {
      var parent = null;
      for (var j = 0; j < i; j++) {
        if (contains(items[j].pts, items[i].pts[0])) {
          // the innermost container is the last (smallest) one that holds it
          parent = items[j];
        }
      }
      items[i].depth = parent ? parent.depth + 1 : 0;
      items[i].parent = parent;
    }
    var toVec = function(p) {
      return new THREE.Vector2((p[0] - origin.x) / px, -(p[1] - origin.y) / px);
    };
    var shapes = [];
    items.forEach(function(it) {
      if (it.depth % 2 === 0) {
        it.shape = new THREE.Shape(it.pts.map(toVec));
        shapes.push(it.shape);
      }
    });
    items.forEach(function(it) {
      if (it.depth % 2 === 1 && it.parent && it.parent.shape) {
        it.parent.shape.holes.push(new THREE.Path(it.pts.map(toVec)));
      }
    });
    return shapes;
  }

  /* ------------------------------------------------------------------ */
  /* Surfaces                                                            */
  /* ------------------------------------------------------------------ */

  var loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  var texCache = {};
  function texture(url, onLoad) {
    if (texCache[url]) return texCache[url];
    var t = loader.load(url, function() {
      if (onLoad) onLoad();
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache[url] = t;
    return t;
  }
  function sphereMap(url, onLoad) {
    var k = 'sph:' + url;
    if (texCache[k]) return texCache[k];
    var t = loader.load(url, function() {
      if (onLoad) onLoad();
    });
    t.mapping = THREE.SphericalReflectionMapping;
    texCache[k] = t;
    return t;
  }

  function material() {
    var specular = options.specular;
    var opts = {
      color: 0xffffff,
      shininess: specular ? 60 : 0,
      specular: specular ? 0xb0b0b0 : 0x000000,
    };
    if (options.surface === 'texture') {
      var url =
        options.customTexture && options.textureUrl
          ? options.textureUrl
          : 'texture.jpg';
      opts.map = texture(url, needsRender);
    } else if (options.surface === 'reflection') {
      var rurl =
        options.customReflection && options.reflectionUrl
          ? options.reflectionUrl
          : 'reflection.jpg';
      opts.envMap = sphereMap(rurl, needsRender);
      opts.reflectivity = 1;
      opts.combine = THREE.MultiplyOperation;
    } else {
      opts.color = options.customColor
        ? new THREE.Color(options.color)
        : runColor;
    }
    return new THREE.MeshPhongMaterial(opts);
  }
  function needsRender() {}

  /* ------------------------------------------------------------------ */
  /* The mesh                                                            */
  /* ------------------------------------------------------------------ */

  var mesh = null;
  var textSize = null;
  var textHalf = { x: 1, y: 1, z: 1 };
  var lastKey = '';

  function label() {
    return options.useTime
      ? new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      : options.text || ' ';
  }

  function build() {
    var text = label();
    var key = [
      text,
      options.fontFamily,
      options.bold,
      options.italic,
      options.resolution,
      options.surface,
      options.customColor,
      options.color,
      options.customTexture,
      options.textureUrl,
      options.customReflection,
      options.reflectionUrl,
      options.specular,
    ].join('|');
    if (key === lastKey) return;
    lastKey = key;

    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh = null;
    }

    // Resolution: how finely the outline is followed. Low keeps a coarse
    // polygonal outline like the original's low tessellation, High is
    // smooth.
    var res = Math.max(1, Math.min(20, options.resolution));
    var px = 64 + res * 12;
    var tol = 0.7 + (20 - res) * 0.22;
    var font =
      (options.italic ? 'italic ' : '') +
      (options.bold ? 'bold ' : '') +
      px +
      'px "' +
      options.fontFamily +
      '"';
    var traced = traceText(text, font, px);
    var loops = traced.loops
      .map(function(l) {
        return simplify(l, tol);
      })
      .filter(function(l) {
        return l.length >= 3;
      });
    var shapes = shapesFrom(loops, px, {
      x: traced.w / 2,
      y: traced.baseY - px * 0.36, // centre on the x-height
    });
    if (!shapes.length) return;

    var geo = new THREE.ExtrudeBufferGeometry(shapes, {
      depth: 0.45, // em — D3DXCreateText's extrusion, no bevel
      bevelEnabled: false,
      steps: 1,
    });
    geo.computeBoundingBox();
    geo.center();
    geo.computeVertexNormals();
    // Texture tiles: the built-in bitmap covers about an em, as the
    // original's planar mapping does
    var uv = geo.attributes.uv;
    for (var i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 0.9);
    geo.computeBoundingBox();
    textSize = {
      w: geo.boundingBox.max.x - geo.boundingBox.min.x || 1,
      h: geo.boundingBox.max.y - geo.boundingBox.min.y || 1,
      d: geo.boundingBox.max.z - geo.boundingBox.min.z || 1,
    };
    textHalf = { x: textSize.w / 2, y: textSize.h / 2, z: textSize.d / 2 };

    mesh = new THREE.Mesh(geo, material());
    scene.add(mesh);
    fit();
  }

  /**
   * Frame the text from its LOCAL extents, so the camera stays put while the
   * mesh rotates. The camera is pulled back to leave room for the text to
   * travel around the screen; Size brings it closer.
   */
  var ROOM = 1.45;
  function fit() {
    if (!textSize) return;
    var w = Math.hypot(textSize.w, textSize.d);
    var h = textSize.h;
    var aspect = (canvas.clientWidth || 1) / Math.max(1, canvas.clientHeight);
    var vFov = (camera.fov * Math.PI) / 180;
    var distH = h / 2 / Math.tan(vFov / 2);
    var distW = w / 2 / Math.tan(vFov / 2) / aspect;
    var dist = Math.max(distH, distW) * ROOM;
    camera.position.z = dist * (10 / Math.max(1, options.size));
  }

  /**
   * The rectangle the text's centre may wander inside, recomputed every
   * frame because a spinning string is much wider face-on than edge-on.
   */
  var bounds = { x: 0, y: 0 };
  var _rot = new THREE.Matrix4();
  function updateBounds() {
    if (!mesh) return;
    _rot.makeRotationFromEuler(mesh.rotation);
    var e = _rot.elements;
    var hx = textHalf.x;
    var hy = textHalf.y;
    var hz = textHalf.z;
    var rx = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz;
    var ry = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz;
    var rz = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;
    var dist = Math.max(1, camera.position.z - rz);
    var vFov = (camera.fov * Math.PI) / 180;
    var halfH = Math.tan(vFov / 2) * dist;
    var halfW = halfH * (camera.aspect || 1);
    bounds.x = Math.max(0, halfW - rx);
    bounds.y = Math.max(0, halfH - ry);
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    fit();
  }
  window.addEventListener('resize', resize);

  // The text drifts around and bounces off the edges of the frame while it
  // rotates, the way the real saver moves it.
  var pos = { x: 0, y: 0 };
  var vel = { x: 3.4, y: 2.2 };
  var t = 0;
  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    if (options.useTime) build();
    if (mesh) {
      t += dt * (options.speed / 10);
      var r = options.rotation;
      if (r === 'spin') {
        mesh.rotation.set(0, t, 0);
      } else if (r === 'seesaw') {
        mesh.rotation.set(0, Math.sin(t) * 1.15, 0);
      } else if (r === 'wobble') {
        mesh.rotation.set(Math.sin(t * 0.7) * 0.5, Math.sin(t) * 1.0, 0);
      } else if (r === 'tumble') {
        mesh.rotation.set(t * 0.53, t, t * 0.31);
      } else {
        mesh.rotation.set(0, 0, 0);
      }

      updateBounds();
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      if (pos.x < -bounds.x) {
        pos.x = -bounds.x;
        vel.x = Math.abs(vel.x);
      } else if (pos.x > bounds.x) {
        pos.x = bounds.x;
        vel.x = -Math.abs(vel.x);
      }
      if (pos.y < -bounds.y) {
        pos.y = -bounds.y;
        vel.y = Math.abs(vel.y);
      } else if (pos.y > bounds.y) {
        pos.y = bounds.y;
        vel.y = -Math.abs(vel.y);
      }
      mesh.position.set(pos.x, pos.y, 0);
    }
    renderer.render(scene, camera);
  }

  resize();
  build();
  requestAnimationFrame(loop);

  // The web-xp shell pushes the Settings dialog's values in here.
  window.__xpApplyText3DSettings = function(next) {
    if (!next) return;
    Object.keys(next).forEach(function(k) {
      if (next[k] !== undefined) options[k] = next[k];
    });
    build();
    fit();
  };
})();
