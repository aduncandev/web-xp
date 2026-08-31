/* global THREE */
/* eslint-disable no-restricted-globals, no-redeclare */
// Plain browser script: THREE comes from lib/three.min.js via a <script> tag.
var gridBounds = new THREE.Box3(
  new THREE.Vector3(-10, -10, -10),
  new THREE.Vector3(10, 10, 10),
);
var nodes = {};
function setAt(position, value) {
  nodes['(' + position.x + ', ' + position.y + ', ' + position.z + ')'] = value;
}
function getAt(position, value) {
  return nodes['(' + position.x + ', ' + position.y + ', ' + position.z + ')'];
}
function clearGrid() {
  nodes = {};
}

// the six lattice directions a pipe can grow in
var DIRECTIONS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

var textures = {};
var Pipe = function(scene, options) {
  var self = this;
  var pipeRadius = 0.2;
  var ballJointRadius = pipeRadius * 1.5;
  var teapotSize = ballJointRadius;
  // "Flex" pipes (sspipes' flexible style) sweep smoothly through the
  // lattice with a cross-section that swells and narrows along the run,
  // instead of straight sections with joints.
  var flex = options.style === 'flex';
  var flexPhase = random(0, Math.PI * 2);
  var flexLength = 0; // cells grown so far, drives the swelling
  var flexRadiusAt = function(cells) {
    return pipeRadius * (1.1 + 0.35 * Math.sin(cells * 1.9 + flexPhase));
  };

  self.stuck = false;
  self.currentPosition = randomIntegerVector3WithinBox(gridBounds);
  // don't start on top of an existing pipe if it can be helped
  for (
    var attempt = 0;
    attempt < 20 && getAt(self.currentPosition);
    attempt++
  ) {
    self.currentPosition = randomIntegerVector3WithinBox(gridBounds);
  }
  self.positions = [self.currentPosition];
  self.object3d = new THREE.Object3D();
  self.object3d.userData.isPipe = true;
  scene.add(self.object3d);
  if (options.texturePath) {
    self.material = new THREE.MeshLambertMaterial({
      map: textures[options.texturePath],
    });
  } else {
    var color = randomInteger(0, 0xffffff);
    var emissive = new THREE.Color(color).multiplyScalar(0.3);
    self.material = new THREE.MeshPhongMaterial({
      specular: 0xa9fcff,
      color: color,
      emissive: emissive,
      shininess: 100,
    });
  }
  // trimStart shortens the straight at its start so an elbow can take over
  // that stretch; the mesh is returned so its far end can be trimmed later.
  var makeCylinderBetweenPoints = function(
    fromPoint,
    toPoint,
    material,
    trimStart,
  ) {
    var deltaVector = new THREE.Vector3().subVectors(toPoint, fromPoint);
    var direction = deltaVector.clone().normalize();
    var length = deltaVector.length() - (trimStart || 0);
    var start = fromPoint.clone().addScaledVector(direction, trimStart || 0);
    var arrow = new THREE.ArrowHelper(direction, start);
    var geometry = new THREE.CylinderGeometry(
      pipeRadius,
      pipeRadius,
      length,
      10,
      4,
      true,
    );
    var mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.setFromQuaternion(arrow.quaternion);
    mesh.position.copy(start).addScaledVector(direction, length / 2);
    mesh.userData = {
      direction: direction,
      geometryLength: length,
      length: length,
    };
    mesh.updateMatrix();

    self.object3d.add(mesh);
    return mesh;
  };
  var trimCylinderEnd = function(mesh, amount) {
    var data = mesh.userData;
    data.length -= amount;
    mesh.scale.y = data.length / data.geometryLength;
    mesh.position.addScaledVector(data.direction, -amount / 2);
  };
  var lastCylinder = null;
  var makeBallJoint = function(position) {
    var ball = new THREE.Mesh(
      new THREE.SphereGeometry(ballJointRadius, 8, 8),
      self.material,
    );
    ball.position.copy(position);
    self.object3d.add(ball);
  };
  var makeTeapotJoint = function(position) {
    //var teapotTexture = textures[options.texturePath].clone();
    //teapotTexture.repeat.set(1, 1);

    // THREE.TeapotBufferGeometry = function ( size, segments, bottom, lid, body, fitLid, blinn )
    var teapot = new THREE.Mesh(
      new THREE.TeapotBufferGeometry(teapotSize, true, true, true, true, true),
      self.material,
      //new THREE.MeshLambertMaterial({ map: teapotTexture })
    );
    teapot.position.copy(position);
    teapot.rotation.x = (Math.floor(random(0, 50)) * Math.PI) / 2;
    teapot.rotation.y = (Math.floor(random(0, 50)) * Math.PI) / 2;
    teapot.rotation.z = (Math.floor(random(0, 50)) * Math.PI) / 2;
    self.object3d.add(teapot);
  };
  // A real elbow, as in sspipes: a quarter torus whose bend radius equals
  // the pipe radius, so the outside of the corner is rounded and the inside
  // pinches to a crease. The straights on either side stop one radius short
  // of the corner and the elbow bridges them.
  var makeElbowJoint = function(position, inDirection, outDirection) {
    var center = position
      .clone()
      .addScaledVector(inDirection, -pipeRadius)
      .addScaledVector(outDirection, pipeRadius);
    // the arc runs from the end of the incoming straight (-out of center)
    // to the start of the outgoing one (+in of center)
    var xAxis = outDirection.clone().negate();
    var yAxis = inDirection.clone();
    var zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
    var elbow = new THREE.Mesh(
      new THREE.TorusGeometry(pipeRadius, pipeRadius, 10, 6, Math.PI / 2),
      self.material,
    );
    elbow.setRotationFromMatrix(
      new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis),
    );
    elbow.position.copy(center);
    self.object3d.add(elbow);
  };

  // One flex section: a tube along `curve`, its radius following the
  // pipe's swell curve between `fromCells` and `toCells` along the run.
  // The ring frame is parallel-transported from section to section (rather
  // than each tube computing its own) so consecutive sections share a ring
  // and join without a seam.
  var flexFrameNormal = null;
  var makeFlexSection = function(curve, fromCells, toCells) {
    var tubularSegments = 8;
    var radialSegments = 10;
    var geometry = new THREE.TubeBufferGeometry(
      curve,
      tubularSegments,
      1,
      radialSegments,
      false,
    );
    var positions = geometry.attributes.position;
    var normals = geometry.attributes.normal;
    var tangent = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var spoke = new THREE.Vector3();
    for (var i = 0; i <= tubularSegments; i++) {
      var along = i / tubularSegments;
      var center = curve.getPointAt(along);
      var radius = flexRadiusAt(fromCells + (toCells - fromCells) * along);
      tangent.copy(curve.getTangentAt(along)).normalize();
      if (!flexFrameNormal) {
        // any direction square to the first tangent will do
        flexFrameNormal = new THREE.Vector3(0, 1, 0);
        if (Math.abs(tangent.y) > 0.9) flexFrameNormal.set(1, 0, 0);
      }
      flexFrameNormal
        .addScaledVector(tangent, -flexFrameNormal.dot(tangent))
        .normalize();
      binormal.crossVectors(tangent, flexFrameNormal);
      for (var j = 0; j <= radialSegments; j++) {
        // same ring sense as TubeBufferGeometry so its faces stay outward
        var angle = (j / radialSegments) * Math.PI * 2;
        spoke
          .copy(flexFrameNormal)
          .multiplyScalar(-Math.cos(angle))
          .addScaledVector(binormal, Math.sin(angle));
        var index = i * (radialSegments + 1) + j;
        normals.setXYZ(index, spoke.x, spoke.y, spoke.z);
        positions.setXYZ(
          index,
          center.x + spoke.x * radius,
          center.y + spoke.y * radius,
          center.z + spoke.z * radius,
        );
      }
    }
    self.object3d.add(new THREE.Mesh(geometry, self.material));
  };
  var makeFlexCap = function(position, cells) {
    var cap = new THREE.Mesh(
      new THREE.SphereGeometry(flexRadiusAt(cells), 10, 8),
      self.material,
    );
    cap.position.copy(position);
    self.object3d.add(cap);
  };
  var midpoint = function(a, b) {
    return new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  };

  setAt(self.currentPosition, self);

  if (flex) {
    makeFlexCap(self.currentPosition, 0);
  } else {
    makeBallJoint(self.currentPosition);
  }

  // Nowhere left to grow: cap the pipe off, as the original does, and let
  // the scene start another one.
  var finish = function() {
    self.stuck = true;
    if (flex) {
      // the flex run is drawn half a cell behind its head; bring it home
      if (self.positions.length > 1) {
        var previous = self.positions[self.positions.length - 2];
        makeFlexSection(
          new THREE.LineCurve3(
            midpoint(previous, self.currentPosition),
            self.currentPosition,
          ),
          flexLength - 0.5,
          flexLength,
        );
      }
      makeFlexCap(self.currentPosition, flexLength);
    } else {
      makeBallJoint(self.currentPosition);
    }
  };

  self.update = function() {
    if (self.stuck) {
      return;
    }
    var lastDirectionVector;
    var lastPosition;
    if (self.positions.length > 1) {
      lastPosition = self.positions[self.positions.length - 2];
      lastDirectionVector = new THREE.Vector3().subVectors(
        self.currentPosition,
        lastPosition,
      );
    }
    // Carry straight on half the time; otherwise (or if that's blocked) try
    // the six directions in random order, and give up only when none is free.
    var candidates = DIRECTIONS.slice();
    shuffleArrayInPlace(candidates);
    if (lastDirectionVector && chance(1 / 2)) {
      candidates.unshift(lastDirectionVector);
    }
    var directionVector = null;
    var newPosition = null;
    for (var i = 0; i < candidates.length; i++) {
      var candidate = new THREE.Vector3().addVectors(
        self.currentPosition,
        candidates[i],
      );
      if (gridBounds.containsPoint(candidate) && !getAt(candidate)) {
        directionVector = candidates[i];
        newPosition = candidate;
        break;
      }
    }
    if (!newPosition) {
      finish();
      return;
    }
    setAt(newPosition, self);

    if (flex) {
      // sweep from the middle of the last cell, through this node, to the
      // middle of the next: straight when collinear, a smooth bend when not
      var to = midpoint(self.currentPosition, newPosition);
      var curve = lastPosition
        ? new THREE.QuadraticBezierCurve3(
            midpoint(lastPosition, self.currentPosition),
            self.currentPosition.clone(),
            to,
          )
        : new THREE.LineCurve3(self.currentPosition.clone(), to);
      makeFlexSection(
        curve,
        flexLength - (lastPosition ? 0.5 : 0),
        flexLength + 0.5,
      );
      flexLength += 1;
    } else {
      var turning =
        lastDirectionVector && !lastDirectionVector.equals(directionVector);
      var trimStart = 0;
      // joint
      // (initial ball joint is handled elsewhere)
      if (turning) {
        if (chance(options.teapotChance)) {
          makeTeapotJoint(self.currentPosition);
        } else if (chance(options.ballJointChance)) {
          makeBallJoint(self.currentPosition);
        } else {
          if (lastCylinder) {
            trimCylinderEnd(lastCylinder, pipeRadius);
          }
          makeElbowJoint(
            self.currentPosition,
            lastDirectionVector,
            directionVector,
          );
          trimStart = pipeRadius;
        }
      }

      // pipe
      lastCylinder = makeCylinderBetweenPoints(
        self.currentPosition,
        newPosition,
        self.material,
        trimStart,
      );
    }

    // update
    self.currentPosition = newPosition;
    self.positions.push(newPosition);
  };
};

var JOINTS_ELBOW = 'elbow';
var JOINTS_BALL = 'ball';
var JOINTS_MIXED = 'mixed';
var JOINTS_CYCLE = 'cycle';

var jointsCycleArray = [JOINTS_ELBOW, JOINTS_BALL, JOINTS_MIXED];
var jointsCycleIndex = 0;

var jointTypeSelect = document.getElementById('joint-types');

var pipes = [];
var options = {
  multiple: true,
  texturePath: null,
  joints: jointTypeSelect.value,
  style: 'normal', // sspipes' Pipe Style: "normal" | "flex" | "mixed"
  speed: 10, // growth rate, 1..20; 10 is one segment per pipe per frame
  hosted: false, // true once the web-xp shell has pushed its settings in
  interval: [16, 24], // range of seconds between fade-outs... not necessarily anything like how the original works
};
jointTypeSelect.addEventListener('change', function() {
  options.joints = jointTypeSelect.value;
});

var canvasContainer = document.getElementById('canvas-container');

// 2d canvas for dissolve effect
var canvas2d = document.getElementById('canvas-2d');
var ctx2d = canvas2d.getContext('2d');

// renderer
var canvasWebGL = document.getElementById('canvas-webgl');
var renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  canvas: canvasWebGL,
});
renderer.setSize(window.innerWidth, window.innerHeight);

// camera
var camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  100000,
);

// controls
var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enabled = false;
// controls.autoRotate = true;

// scene
var scene = new THREE.Scene();

// lighting
var ambientLight = new THREE.AmbientLight(0x111111);
scene.add(ambientLight);

var directionalLightL = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLightL.position.set(-1.2, 1.5, 0.5);
scene.add(directionalLightL);

// dissolve transition effect

var dissolveRects = [];
var dissolveRectsIndex = -1;
var dissolveRectsPerRow = 50;
var dissolveRectsPerColumn = 50;
var dissolveTransitionSeconds = 2;
var dissolveTransitionFrames = dissolveTransitionSeconds * 60;
var dissolveEndCallback;

function dissolve(seconds, endCallback) {
  // TODO: determine rect sizes better and simplify
  // (silly approximation of squares of a particular size:)
  dissolveRectsPerRow = Math.ceil(window.innerWidth / 20);
  dissolveRectsPerColumn = Math.ceil(window.innerHeight / 20);

  dissolveRects = new Array(dissolveRectsPerRow * dissolveRectsPerColumn)
    .fill(null)
    .map(function(_null, index) {
      return {
        x: index % dissolveRectsPerRow,
        y: Math.floor(index / dissolveRectsPerRow),
      };
    });
  shuffleArrayInPlace(dissolveRects);
  dissolveRectsIndex = 0;
  dissolveTransitionSeconds = seconds;
  dissolveTransitionFrames = dissolveTransitionSeconds * 60;
  dissolveEndCallback = endCallback;
}
function finishDissolve() {
  dissolveEndCallback();
  dissolveRects = [];
  dissolveRectsIndex = -1;
  ctx2d.clearRect(0, 0, canvas2d.width, canvas2d.height);
}

var clearing = false;
var clearTID = -1;
function clear(fast) {
  clearTimeout(clearTID);
  clearTID = setTimeout(
    clear,
    random(options.interval[0], options.interval[1]) * 1000,
  );
  if (!clearing) {
    clearing = true;
    var fadeOutTime = fast ? 0.2 : 2;
    dissolve(fadeOutTime, reset);
  }
}
clearTID = setTimeout(
  clear,
  random(options.interval[0], options.interval[1]) * 1000,
);

function reset() {
  renderer.clear();
  // finished pipes have already left `pipes`, so sweep the scene itself
  for (var i = scene.children.length - 1; i >= 0; i--) {
    var object = scene.children[i];
    if (object.userData.isPipe) {
      object.traverse(function(child) {
        if (child.geometry) child.geometry.dispose();
      });
      scene.remove(object);
    }
  }
  pipes = [];
  clearGrid();
  look();
  clearing = false;
}

function loadTexture(texturePath) {
  if (texturePath && !textures[texturePath]) {
    var texture = THREE.ImageUtils.loadTexture(texturePath);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    textures[texturePath] = texture;
  }
}

// options shared by every pipe of the current scene (respawns included)
var scenePipeOptions = null;
function spawnPipe() {
  var pipeOptions = Object.assign({}, scenePipeOptions);
  // "Mixed" style: each pipe is either kind
  if (options.style === 'mixed') {
    pipeOptions.style = chooseFrom(['normal', 'flex']);
  }
  return new Pipe(scene, pipeOptions);
}

// fractional segments carried between frames at speeds that aren't a whole
// number of segments per frame
var growth = 0;

// this function is executed on each animation frame
function animate() {
  controls.update();
  loadTexture(options.texturePath);
  // update
  growth += Math.max(1, Math.min(20, options.speed || 10)) / 10;
  var steps = Math.floor(growth);
  growth -= steps;
  for (var step = 0; step < steps; step++) {
    for (var i = 0; i < pipes.length; i++) {
      pipes[i].update(scene);
    }
  }
  if (pipes.length === 0) {
    var jointType = options.joints;
    if (options.joints === JOINTS_CYCLE) {
      jointType =
        jointsCycleArray[jointsCycleIndex++ % jointsCycleArray.length];
    }
    scenePipeOptions = {
      teapotChance: 1 / 200, // 1 / 1000 in the original
      ballJointChance:
        jointType === JOINTS_BALL ? 1 : jointType === JOINTS_MIXED ? 1 / 3 : 0,
      texturePath: options.texturePath,
      style: options.style,
    };
    // A candy cane surprise, for the standalone page only: when the shell
    // is driving, Surface Style means exactly what the dialog says.
    if (!options.hosted && chance(1 / 20)) {
      scenePipeOptions.teapotChance = 1 / 20; // why not? :)
      scenePipeOptions.texturePath = 'images/textures/candycane.png';
      loadTexture(scenePipeOptions.texturePath);
    }
    for (var i = 0; i < 1 + options.multiple * (1 + chance(1 / 10)); i++) {
      pipes.push(spawnPipe());
    }
  } else {
    // a pipe that has boxed itself in stays on screen; another one starts
    for (var i = 0; i < pipes.length; i++) {
      if (pipes[i].stuck) {
        pipes[i] = spawnPipe();
      }
    }
  }

  if (!clearing) {
    renderer.render(scene, camera);
  }

  if (
    canvas2d.width !== window.innerWidth ||
    canvas2d.height !== window.innerHeight
  ) {
    canvas2d.width = window.innerWidth;
    canvas2d.height = window.innerHeight;
    // TODO: DRY!
    // actually: TODO: make the 2d canvas really low resolution, and stretch it with CSS, with pixelated interpolation
    if (dissolveRectsIndex > -1) {
      for (var i = 0; i < dissolveRectsIndex; i++) {
        var rect = dissolveRects[i];
        // TODO: could precompute rect in screen space, or at least make this clearer with "xIndex"/"yIndex"
        var rectWidth = innerWidth / dissolveRectsPerRow;
        var rectHeight = innerHeight / dissolveRectsPerColumn;
        ctx2d.fillStyle = 'black';
        ctx2d.fillRect(
          Math.floor(rect.x * rectWidth),
          Math.floor(rect.y * rectHeight),
          Math.ceil(rectWidth),
          Math.ceil(rectHeight),
        );
      }
    }
  }
  if (dissolveRectsIndex > -1) {
    // TODO: calibrate based on time transition is actually taking
    var rectsAtATime = Math.floor(
      dissolveRects.length / dissolveTransitionFrames,
    );
    for (
      var i = 0;
      i < rectsAtATime && dissolveRectsIndex < dissolveRects.length;
      i++
    ) {
      var rect = dissolveRects[dissolveRectsIndex];
      // TODO: could precompute rect in screen space, or at least make this clearer with "xIndex"/"yIndex"
      var rectWidth = innerWidth / dissolveRectsPerRow;
      var rectHeight = innerHeight / dissolveRectsPerColumn;
      ctx2d.fillStyle = 'black';
      ctx2d.fillRect(
        Math.floor(rect.x * rectWidth),
        Math.floor(rect.y * rectHeight),
        Math.ceil(rectWidth),
        Math.ceil(rectHeight),
      );
      dissolveRectsIndex += 1;
    }
    if (dissolveRectsIndex === dissolveRects.length) {
      finishDissolve();
    }
  }

  requestAnimationFrame(animate);
}

function look() {
  // TODO: never don't change the view (except maybe while clearing)
  if (chance(1 / 2)) {
    // head-on view

    camera.position.set(0, 0, 14);
  } else {
    // random view

    var vector = new THREE.Vector3(14, 0, 0);

    var axis = new THREE.Vector3(random(-1, 1), random(-1, 1), random(-1, 1));
    var angle = Math.PI / 2;
    var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);

    vector.applyMatrix4(matrix);
    camera.position.copy(vector);
  }
  var center = new THREE.Vector3(0, 0, 0);
  camera.lookAt(center);
  // camera.updateProjectionMatrix(); // maybe?
  controls.update();
}
look();

addEventListener(
  'resize',
  function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  },
  false,
);

canvasContainer.addEventListener('mousedown', function(e) {
  e.preventDefault();
  if (!controls.enabled) {
    if (e.button) {
      clear(true);
    } else {
      look();
    }
  }
  window.getSelection().removeAllRanges();
  document.activeElement.blur();
});

canvasContainer.addEventListener(
  'contextmenu',
  function(e) {
    e.preventDefault();
  },
  false,
);

var fullscreenButton = document.getElementById('fullscreen-button');
fullscreenButton.addEventListener(
  'click',
  function(e) {
    if (canvasContainer.requestFullscreen) {
      // W3C API
      canvasContainer.requestFullscreen();
    } else if (canvasContainer.mozRequestFullScreen) {
      // Mozilla current API
      canvasContainer.mozRequestFullScreen();
    } else if (canvasContainer.webkitRequestFullScreen) {
      // Webkit current API
      canvasContainer.webkitRequestFullScreen();
    }
  },
  false,
);

var toggleControlButton = document.getElementById('toggle-controls');
toggleControlButton.addEventListener(
  'click',
  function(e) {
    controls.enabled = !controls.enabled;
    showElementsIf('.normal-controls-enabled', !controls.enabled);
    showElementsIf('.orbit-controls-enabled', controls.enabled);
  },
  false,
);

// parse URL parameters
// support e.g. <iframe src="https://1j01.github.io/pipes/#{%22hideUI%22:true}"/>
function updateFromParametersInURL() {
  var paramsJSON = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (paramsJSON) {
    try {
      var params = JSON.parse(paramsJSON);
      if (typeof params !== 'object') {
        alert('Invalid URL parameter JSON: top level value must be an object');
        params = null;
      }
    } catch (error) {
      alert(
        'Invalid URL parameter JSON syntax\n\n' +
          error +
          '\n\nRecieved:\n' +
          paramsJSON,
      );
    }
  }
  params = params || {};

  // update based on the parameters
  // TODO: support more options
  showElementsIf('.ui-container', !params.hideUI);
}

updateFromParametersInURL();
window.addEventListener('hashchange', updateFromParametersInURL);

// start animation
animate();

/**************\
|boring helpers|
\**************/
function random(x1, x2) {
  return Math.random() * (x2 - x1) + x1;
}
function randomInteger(x1, x2) {
  return Math.round(random(x1, x2));
}
function chance(value) {
  return Math.random() < value;
}
function chooseFrom(values) {
  return values[Math.floor(Math.random() * values.length)];
}
function shuffleArrayInPlace(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
function randomIntegerVector3WithinBox(box) {
  return new THREE.Vector3(
    randomInteger(box.min.x, box.max.x),
    randomInteger(box.min.y, box.max.y),
    randomInteger(box.min.z, box.max.z),
  );
}
function showElementsIf(selector, condition) {
  Array.from(document.querySelectorAll(selector)).forEach(function(el) {
    if (condition) {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', 'hidden');
    }
  });
}
