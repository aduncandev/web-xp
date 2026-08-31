/*
 * Windows XP "3D Flying Objects" (ss3dfo.scr), rebuilt on three.js r98.
 *
 * The bitmaps are the real binary's own resources: the 512x512 Windows XP
 * logo (PNG 3002) and the "experience" banner (JPG 3000). Styles and option
 * names come from the .scr's string table and DIALOG resource.
 *
 * What the real saver does that the eye remembers, and this keeps to:
 *  - every object drifts about the screen, turning over, and bounces off
 *    the edges of the view;
 *  - Windows Logo is the flag alone (the flag region of the logo bitmap,
 *    its black knocked out) waving as a cloth — no text, no square;
 *  - Explode is a shell of hundreds of small red shards that burst apart,
 *    hang, and are drawn back into a ball;
 *  - Splash is a thick disc seen from above, a white drop, and the ripple
 *    the drop makes running out across the top;
 *  - Textured Flag is the "experience" banner as waving cloth.
 */
(function() {
  var canvas = document.getElementById('c');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(1);
  var scene = new THREE.Scene();
  var FOV = 45;
  var DIST = 22;
  var camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500);
  camera.position.set(0, 0, DIST);

  scene.add(new THREE.AmbientLight(0x555555));
  var key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(-0.5, 0.8, 1);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(1, -0.5, 0.5);
  scene.add(fill);

  var loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  var TEX = {
    flag: null, // the flag cut from the logo bitmap, black made clear
    experience: loader.load('textures/experience.jpg'),
    custom: null, // the bitmap the dialog's Texture... button chose
    customUrl: '',
  };
  // "Textured Flag" waves the bitmap from Texture...; the "experience"
  // banner inside ss3dfo.scr is what it shows until one is chosen.
  function flagTexture() {
    var url = options.textureUrl || '';
    if (url !== TEX.customUrl) {
      TEX.customUrl = url;
      TEX.custom = url
        ? loader.load(url, function() {
            built = ''; // rebuild once the bitmap is in
          })
        : null;
    }
    return TEX.custom || TEX.experience;
  }
  // The flag sits in this region of the 512x512 logo bitmap (measured);
  // the bitmap is black around it, so luminance makes a clean alpha.
  var FLAG_RECT = { x: 207, y: 123, w: 196, h: 168 };
  var logoImg = new Image();
  logoImg.onload = function() {
    var c = document.createElement('canvas');
    c.width = FLAG_RECT.w;
    c.height = FLAG_RECT.h;
    var g = c.getContext('2d');
    g.drawImage(
      logoImg,
      FLAG_RECT.x,
      FLAG_RECT.y,
      FLAG_RECT.w,
      FLAG_RECT.h,
      0,
      0,
      FLAG_RECT.w,
      FLAG_RECT.h,
    );
    var id = g.getImageData(0, 0, c.width, c.height);
    var d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      d[i + 3] = Math.max(0, Math.min(255, (lum - 14) * 10));
    }
    g.putImageData(id, 0, 0);
    TEX.flag = new THREE.CanvasTexture(c);
    TEX.flag.minFilter = THREE.LinearFilter;
    built = ''; // rebuild with the texture in hand
  };
  logoImg.src = 'textures/winlogo.png';

  var options = {
    style: 'logo',
    colorCycling: false,
    smoothShading: true,
    resolution: 10, // 1..20
    size: 10, // 1..20
    textureUrl: '', // the shell resolves the chosen VFS file to a URL
  };

  var group = new THREE.Group();
  scene.add(group);
  var built = '';
  var meshes = [];
  var shardData = null;
  var splash = null;

  function clearGroup() {
    while (group.children.length) {
      var m = group.children[0];
      group.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    meshes = [];
    shardData = null;
    splash = null;
  }

  /** A cloth plane that can be rippled per-frame. */
  function makeCloth(w, h, seg, material) {
    var geo = new THREE.PlaneGeometry(w, h, seg, Math.max(2, seg >> 1));
    var mesh = new THREE.Mesh(geo, material);
    mesh.userData.rest = geo.vertices.map(function(v) {
      return v.clone();
    });
    mesh.userData.cloth = true;
    return mesh;
  }

  function ribbonGeometry(seg, phase, radius) {
    var geo = new THREE.Geometry();
    var R = radius || 4.2;
    var width = 1.15;
    for (var i = 0; i <= seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      var cx = Math.cos(a) * R;
      var cy = Math.sin(a * 2 + (phase || 0)) * 1.4;
      var cz = Math.sin(a) * R;
      geo.vertices.push(new THREE.Vector3(cx, cy - width, cz));
      geo.vertices.push(new THREE.Vector3(cx, cy + width, cz));
    }
    for (var j = 0; j < seg; j++) {
      var b = j * 2;
      geo.faces.push(new THREE.Face3(b, b + 1, b + 3));
      geo.faces.push(new THREE.Face3(b, b + 3, b + 2));
    }
    geo.computeFaceNormals();
    geo.computeVertexNormals();
    return geo;
  }

  /** A straight strip twisted along its length; it turns on its axis. */
  function twistGeometry(seg) {
    var geo = new THREE.Geometry();
    var L = 11;
    var width = 1.5;
    for (var i = 0; i <= seg; i++) {
      var u = i / seg;
      var x = (u - 0.5) * L;
      var roll = u * Math.PI * 3;
      geo.vertices.push(
        new THREE.Vector3(x, -Math.cos(roll) * width, -Math.sin(roll) * width),
      );
      geo.vertices.push(
        new THREE.Vector3(x, Math.cos(roll) * width, Math.sin(roll) * width),
      );
    }
    for (var j = 0; j < seg; j++) {
      var b = j * 2;
      geo.faces.push(new THREE.Face3(b, b + 1, b + 3));
      geo.faces.push(new THREE.Face3(b, b + 3, b + 2));
    }
    geo.computeFaceNormals();
    geo.computeVertexNormals();
    return geo;
  }

  function material(color, map, doubleSide, flat) {
    return new THREE.MeshPhongMaterial({
      color: color,
      map: map || null,
      shininess: 40,
      specular: 0x333333,
      flatShading: flat === undefined ? !options.smoothShading : flat,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      transparent: !!map && map === TEX.flag,
      alphaTest: map === TEX.flag ? 0.3 : 0,
    });
  }

  /**
   * Explode: a sphere's surface cut into small triangles, one geometry,
   * whose vertices are moved each frame — every shard carried out along
   * its own normal, spinning on its own axis, and back again.
   */
  function buildShards(seg) {
    var rings = Math.max(8, Math.round(seg * 0.45));
    var segs = rings * 2;
    var geo = new THREE.Geometry();
    var data = [];
    var R = 3.6;
    function pt(p, a) {
      return new THREE.Vector3(
        Math.sin(p) * Math.cos(a),
        Math.cos(p),
        Math.sin(p) * Math.sin(a),
      );
    }
    for (var i = 0; i < rings; i++)
      for (var j = 0; j < segs; j++) {
        var p0 = (i / rings) * Math.PI;
        var p1 = ((i + 1) / rings) * Math.PI;
        var a0 = (j / segs) * Math.PI * 2;
        var a1 = ((j + 1) / segs) * Math.PI * 2;
        var q = [pt(p0, a0), pt(p1, a0), pt(p1, a1), pt(p0, a1)];
        var tris = [
          [q[0], q[1], q[2]],
          [q[0], q[2], q[3]],
        ];
        for (var k = 0; k < 2; k++) {
          var tri = tris[k];
          var c = new THREE.Vector3()
            .add(tri[0])
            .add(tri[1])
            .add(tri[2])
            .multiplyScalar(1 / 3)
            .normalize();
          var base = geo.vertices.length;
          for (var v = 0; v < 3; v++)
            geo.vertices.push(tri[v].clone().multiplyScalar(R));
          geo.faces.push(new THREE.Face3(base, base + 1, base + 2));
          data.push({
            local: tri.map(function(t) {
              return t
                .clone()
                .sub(c)
                .multiplyScalar(R);
            }),
            c: c,
            axis: new THREE.Vector3(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5,
            ).normalize(),
            spin: (Math.random() - 0.5) * 8,
            far: R * (0.45 + Math.random() * 0.55),
          });
        }
      }
    geo.computeFaceNormals();
    var mesh = new THREE.Mesh(geo, material(0xe01e1e, null, true, true));
    mesh.userData.shards = true;
    shardData = { data: data, R: R };
    return mesh;
  }

  /** Splash: the disc's top is its own radial mesh so the ripple can run. */
  function buildSplash(seg) {
    var Rd = 4;
    var Hd = 1.1;
    var rings = 12;
    var segs = Math.max(12, seg * 2);
    var top = new THREE.Geometry();
    for (var i = 0; i <= rings; i++)
      for (var j = 0; j < segs; j++) {
        var r = (i / rings) * Rd;
        var a = (j / segs) * Math.PI * 2;
        top.vertices.push(
          new THREE.Vector3(Math.cos(a) * r, Hd / 2, -Math.sin(a) * r),
        );
      }
    for (var ii = 0; ii < rings; ii++)
      for (var jj = 0; jj < segs; jj++) {
        var a0 = ii * segs + jj;
        var a1 = ii * segs + ((jj + 1) % segs);
        var b0 = (ii + 1) * segs + jj;
        var b1 = (ii + 1) * segs + ((jj + 1) % segs);
        top.faces.push(new THREE.Face3(a0, b0, b1));
        top.faces.push(new THREE.Face3(a0, b1, a1));
      }
    top.computeFaceNormals();
    top.computeVertexNormals();
    var topMesh = new THREE.Mesh(top, material(0x7850e1));
    topMesh.userData.rest = top.vertices.map(function(v) {
      return v.clone();
    });
    var side = new THREE.Mesh(
      new THREE.CylinderGeometry(Rd, Rd, Hd, segs, 1, true),
      material(0x2337d7, null, true),
    );
    var drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, seg, seg),
      material(0xf4f4ff),
    );
    splash = { top: topMesh, drop: drop, Rd: Rd, Hd: Hd };
    return [topMesh, side, drop];
  }

  function build() {
    var key2 =
      options.style +
      '|' +
      options.resolution +
      '|' +
      options.smoothShading +
      '|' +
      (options.style === 'flag' ? options.textureUrl || '' : '');
    if (key2 === built) return;
    built = key2;
    clearGroup();

    var seg = Math.max(6, Math.round(options.resolution * 2.5));

    if (options.style === 'logo') {
      // the flag alone, a cloth at the bitmap's own proportions
      if (TEX.flag) {
        var m = makeCloth(8.4, 7.2, seg, material(0xffffff, TEX.flag, true));
        group.add(m);
        meshes.push(m);
      }
    } else if (options.style === 'flag') {
      // The "experience" banner, waving like cloth — 563x130, so wide
      var tex = flagTexture();
      var img = tex.image;
      // keep the bitmap's own proportions, as the original stretches the
      // cloth to the picture
      var ratio =
        img && img.width && img.height ? img.width / img.height : 563 / 130;
      ratio = Math.max(0.5, Math.min(6, ratio));
      var fw = ratio >= 1 ? 11 : 11 * ratio;
      var fh = ratio >= 1 ? 11 / ratio : 11;
      var f = makeCloth(fw, fh, seg, material(0xffffff, tex, true));
      group.add(f);
      meshes.push(f);
    } else if (options.style === 'ribbon' || options.style === 'tworibbons') {
      var count = options.style === 'tworibbons' ? 2 : 1;
      for (var i = 0; i < count; i++) {
        // the second ribbon's wobble is a half-turn out of phase, so the
        // two weave through each other instead of lying on one another
        var r = new THREE.Mesh(
          ribbonGeometry(seg * 2, i * Math.PI, i ? 3.9 : 4.2),
          material(i ? 0xff7878 : 0x6ea5ff, null, true),
        );
        group.add(r);
        meshes.push(r);
      }
    } else if (options.style === 'twist') {
      var tw = new THREE.Mesh(
        twistGeometry(seg * 3),
        material(0x6ea5ff, null, true),
      );
      tw.userData.twist = true;
      group.add(tw);
      meshes.push(tw);
    } else if (options.style === 'splash') {
      var parts = buildSplash(seg);
      for (var p = 0; p < parts.length; p++) {
        group.add(parts[p]);
        meshes.push(parts[p]);
      }
    } else {
      var sh = buildShards(seg);
      group.add(sh);
      meshes.push(sh);
    }
    applySize();
  }

  function applySize() {
    var k = options.size / 10;
    group.scale.set(k, k, k);
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  var t = 0;
  var last = 0;
  var hue = 0;
  // the flight: a drift that turns around at the edges of the view
  var pos = { x: 0, y: 0 };
  var vel = { x: 1.3, y: 0.95 };
  var tmpV = new THREE.Vector3();

  function rotateAbout(v, axis, ang) {
    return v.clone().applyAxisAngle(axis, ang);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    t += dt;

    build();

    // Color-cycling walks every untextured surface through the spectrum
    if (options.colorCycling) {
      hue = (hue + dt * 0.12) % 1;
      for (var i = 0; i < meshes.length; i++) {
        var mat = meshes[i].material;
        if (!mat.map) mat.color.setHSL((hue + i * 0.05) % 1, 0.75, 0.55);
      }
    }

    for (var j = 0; j < meshes.length; j++) {
      var m = meshes[j];
      if (m.userData.cloth) {
        // Ripple the cloth: a travelling wave down its length
        var rest = m.userData.rest;
        var vs = m.geometry.vertices;
        for (var v = 0; v < vs.length; v++) {
          var p = rest[v];
          vs[v].z =
            Math.sin(p.x * 0.8 + t * 3.2) * 0.45 +
            Math.sin(p.y * 0.6 + t * 2.1) * 0.18;
        }
        m.geometry.verticesNeedUpdate = true;
        m.geometry.computeFaceNormals();
        m.geometry.computeVertexNormals();
        m.geometry.normalsNeedUpdate = true;
      } else if (m.userData.shards && shardData) {
        // 6 s cycle: whole for a moment, out fast, hang, then drawn back in
        var cyc = (t % 6) / 6;
        var burst;
        if (cyc < 0.07) burst = 0;
        else if (cyc < 0.4) burst = 1 - Math.pow(1 - (cyc - 0.07) / 0.33, 3);
        else if (cyc < 0.62) burst = 1;
        else {
          var e = (cyc - 0.62) / 0.38;
          burst = 1 - e * e * (3 - 2 * e);
        }
        var gv = m.geometry.vertices;
        var dat = shardData.data;
        for (var s = 0; s < dat.length; s++) {
          var d = dat[s];
          var out = burst * d.far;
          var ang = burst * d.spin;
          for (var q = 0; q < 3; q++) {
            var spun = rotateAbout(d.local[q], d.axis, ang);
            tmpV
              .copy(d.c)
              .multiplyScalar(shardData.R + out)
              .add(spun);
            gv[s * 3 + q].copy(tmpV);
          }
        }
        m.geometry.verticesNeedUpdate = true;
        m.geometry.computeFaceNormals();
        m.geometry.normalsNeedUpdate = true;
      } else if (m.userData.twist) {
        m.rotation.x = t * 2.2;
      }
    }

    if (splash) {
      // the drop falls for 1.1 s; the ripple runs out from where it hit
      var cyc2 = t % 3.6;
      var fall = Math.min(1, cyc2 / 1.1);
      var since = Math.max(0, cyc2 - 1.1);
      var ef = fall * fall * (3 - 2 * fall);
      splash.drop.position.y = splash.Hd / 2 + (1 - ef) * 5.2 + 0.36;
      splash.drop.visible = cyc2 < 1.15;
      var tv = splash.top.geometry.vertices;
      var tr = splash.top.userData.rest;
      for (var w2 = 0; w2 < tv.length; w2++) {
        var rr = Math.hypot(tr[w2].x, tr[w2].z) / splash.Rd;
        var yy = 0;
        if (since > 0) {
          var front = since * 1.6;
          var dd = rr - front;
          yy =
            0.34 *
            Math.exp(-since * 1.1) *
            Math.exp(-dd * dd * 14) *
            Math.cos(dd * 22);
        }
        tv[w2].y = tr[w2].y + yy;
      }
      splash.top.geometry.verticesNeedUpdate = true;
      splash.top.geometry.computeFaceNormals();
      splash.top.geometry.computeVertexNormals();
      splash.top.geometry.normalsNeedUpdate = true;
    }

    // The whole object drifts through the scene and bounces off the edges
    // of the view, turning over as it goes — the disc keeps its face up
    var halfH = Math.tan((FOV / 2) * (Math.PI / 180)) * DIST;
    var halfW = halfH * camera.aspect;
    var reach = 5.2 * (options.size / 10);
    var bx = Math.max(0, halfW - reach);
    var by = Math.max(0, halfH - reach);
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    if (pos.x > bx || pos.x < -bx) {
      pos.x = Math.max(-bx, Math.min(bx, pos.x));
      vel.x = -vel.x;
    }
    if (pos.y > by || pos.y < -by) {
      pos.y = Math.max(-by, Math.min(by, pos.y));
      vel.y = -vel.y;
    }
    group.position.set(pos.x, pos.y, 0);
    group.rotation.y = t * 0.55;
    group.rotation.x = splash ? 0.5 : Math.sin(t * 0.42) * 0.55;

    renderer.render(scene, camera);
  }

  resize();
  build();
  requestAnimationFrame(loop);

  window.__xpApplyFlyingSettings = function(next) {
    if (!next) return;
    Object.keys(next).forEach(function(k) {
      if (next[k] !== undefined) options[k] = next[k];
    });
    build();
    applySize();
  };
})();
