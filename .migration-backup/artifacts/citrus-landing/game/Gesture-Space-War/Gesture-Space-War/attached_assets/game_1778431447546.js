// -------------------------------------------------------------
// log
// 20231228 - v1.0: basic game with chaptor 1, 2

// -------------------------------------------------------------
// constants
const IS_TOUCH =
  !!document &&
  ("ontouchstart" in window ||
    ("DocumentTouch" in window && document instanceof DocumentTouch));
const LS_KEY = {
  HIGH_SCORE: "SS-HIGH_SCORE",
  CHAPTOR: "SS-CHAPTOR"
};
const VIEWS = {
  MAIN: document.querySelector("canvas#main"),
  CONTENT: document.querySelector("#content"),
  SCORE: document.querySelector("#score"),
  HIGH_SCORE: document.querySelector("#highScore"),
  TITLE: document.querySelector("#title"),
  INS: document.querySelector("#instructions")
};
const COLORS = {
  WHITE: 0xffffff,
  BLACK: 0x000000,
  PINK: 0xff9999,
  YELLOW: 0xffd200,
  BLUE: 0x53ccdc,
  // custom
  GOLD: 0xaa9855,
  RED_SCEPTRE: 0x840016,
  RED_KISS: 0xa7153a,
  LASER_RED: 0xed2f32,
  LASER_PINK: 0xe930c1
};
const COLOR_DEBUG = COLORS.BLUE;
const COLOR_GOD_MODE = COLORS.GOLD;
// game
const FORCE_RESPAWN_POS_OFFSET = 99999;
const GOD_MODE_MIN_IN_SECS = 2;
const GOD_MODE_RESUME_IN_SECS = 2; // must >= GOD_MODE_MIN_IN_SECS
const GOD_MODE_FLASHES_TIMEOUT = 720; // divisible by 6
const GOD_MODE_FLASH_TIMEOUT = GOD_MODE_FLASHES_TIMEOUT / 6;
// ship
const SHIP_MOVEMENT_KEYBOARD_INCREMENT = 10;
const SHIP_SIZE = 50;
const SHIP_POS_RESET = [0, -120, SHIP_SIZE * -1];
const SHIP_POS_GOD_MODE = [0, 0, -150];
const SHIP_SCALE_RESET = [1, 1, 1];
const SHIP_DEBUG_SCALE = [0.7, 0.6, 1];
const SHIP_ROTATION_RESET = [0, 0, 45]; // CCW
// bullet
const BULLET_SIZE = 8;
const BULLET_POS_Z = SHIP_POS_RESET[2]; // align with ship
// roid
const ROID_SIZE = 16;
const ROID_SIZE_COLLISION_DISCOUNT = 0.9;
const ROID_SCALE = [1, 3];
const ROID_POS_Z = SHIP_POS_RESET[2]; // align with bullets
const ROID_COUNT = Math.floor(window.innerWidth / 24);
const ROID_HIT_POS_DETER = 4;
const ROID_ROTATION_VECTOR_MIN = 0.005;
// alien: triggs
const TRIG_SIZE = 8;
const TRIG_OUTER_SIZE = TRIG_SIZE * 3;
const TRIG_COUNT = 3;
const TRIG_LIFE = 2;
const TRIG_SCORE_INCREMENT = TRIG_LIFE * 10;
const TRIG_POZ_Z = SHIP_POS_RESET[2] / 2;
const TRIG_BULLET_SIZE = 6;
const TRIG_BULLET_POS_Z = BULLET_POS_Z;
const TRIG_FIRE_RATE = 360; // just enough for the ship to nav between two bullets
const TRIG_AIM_BIAS = 40;
const TRIG_SHIFT_TIMEOUT_RANGE = [1000, 5000];
const TRIG_SHIFT_SPEED = 20;
const TRIG_ROTATION_VECTOR = 0.1;
const TRIG_SIZE_COLLISION_DISCOUNT = 0.9;
// star
const STAR_SIZE = 5;
const STAR_POS_Z = STAR_SIZE * -1;
const STAR_COUNT = 100;
// cam
const CAM_BOUNDS = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return [
    w / -2, // left
    w / 2, // right
    h / 2, // top
    h / -2, // bottom
    0.1, // near
    1000 // far
  ];
};
// ins
const INS_TUTOR = [
  {
    cb: () => {
      updateChaptor(0);
    }
  },
  {
    title: "How to play",
    text: "Use mouse or 'Arrow' keys to move around.",
    timeout: 6000
  },
  {
    title: "How to play",
    text: "Hold down left mouse button, or 'SPACE' key to fire.",
    timeout: 6000
  }
];
const INS_CHAP_1 = [
  {
    cb: () => {
      updateChaptor(1);
    }
  },
  {
    title: "Chaptor 1",
    text: "Avoid The Asteroids",
    timeout: 3000
  },
  {
    title: "Ready!?",
    timeout: 2000
  },
  {
    title: "GO!",
    timeout: 1000
  },
  {
    cb: () => {
      // start roids
      spawnRoids();
      scene.add(STORE.roids);
    }
  }
];
// aliens
const INS_CHAP_2 = [
  {
    cb: () => {
      updateChaptor(2);
    }
  },
  {
    title: "Chaptor 2",
    text: "KILL Everything Else",
    timeout: 3000
  },
  {
    title: "Ready!?",
    timeout: 2000
  },
  {
    title: "GO!",
    timeout: 1000
  },
  {
    cb: () => {
      // start triggs
      spawnTriggs();
      scene.add(STORE.triggs);
    }
  }
];
// aliens nest
const INS_CHAP_3 = [
  {
    cb: () => {
      updateChaptor(3);
    }
  },
  {
    title: "Chaptor 3",
    text: "The Nest",
    timeout: 3000
  },
  {
    title: "Ready!?",
    timeout: 2000
  },
  {
    title: "GO!",
    timeout: 1000
  },
  {
    cb: () => {
      // launch alien nest formation
      // clear everything else
      // fast and colour stars?
    }
  }
];
// the wall
const INS_CHAP_4 = [
  {
    cb: () => {
      updateChaptor(4);
    }
  },
  {
    title: "Chaptor 4",
    text: "Bloodbath",
    timeout: 3000
  },
  {
    title: "Ready!?",
    timeout: 2000
  },
  {
    title: "To be continued...",
    timeout: Number.POSITIVE_INFINITY
  },
  {
    cb: () => {
      // background all red
      // things all white,
      // shocking SFX
    }
  }
];

// -------------------------------------------------------------
// data store
const getHighScore = () => {
  const scoreNum = parseInt(localStorage.getItem(LS_KEY.HIGH_SCORE));
  return Number.isFinite(scoreNum) ? scoreNum : 0;
};
const STORE = {
  // game
  chaptor: null,
  debug: false,
  pause: false,
  over: false,
  scoreIncrementRoid: 1,
  scoreIncrementTrigg: TRIG_SCORE_INCREMENT,
  chaptorAdvanceScore: 100, // debug: 10
  score: 0,
  highScore: getHighScore(),
  enemyHitVisualTimeout: 40, // less than shipFire.rate, based on visual
  // instructions
  ins: false,
  insList: [], // { text: '', timeout: 3000 }
  insTimeout: null,
  // ship
  ship: null, // group
  shipStatus: "LIVE", // HIT, LIVE, GOD
  shipGodMode: 0, // GOD mode timeout amount in seconds
  shipFirstShotFired: false,
  shipFire: {
    on: false,
    interval: null,
    rate: 100, // ms, auto fire frequency
    moveVectorY: 20, // speed
    bullets: new THREE.Group()
  },
  shipNav: {
    left: false,
    right: false,
    up: false,
    down: false
  },
  shipPos: {
    x: SHIP_POS_RESET[0],
    y: SHIP_POS_RESET[1],
    z: 0
  },
  // roids
  roids: new THREE.Group(),
  roidsMoveVectorY: [-1, -10], // negative so they move downwards
  roidsCollisionForce: 1,
  // stars
  stars: new THREE.Group(),
  starsMoveVectorY: [-2, -16], // negative so they move downwards
  // triggs
  triggs: new THREE.Group()
};

// -------------------------------------------------------------
// utils
const throttleFunction = (func, delay) => {
  let prev = 0;
  return (...args) => {
    let now = new Date().getTime();
    if (now - prev > delay) {
      prev = now;
      return func(...args);
    }
  };
};
const getRandomIntFromRange = (min, max) => {
  return THREE.MathUtils.randInt(min, max);
};
const getRandomFloatFromRange = (min, max) => {
  return THREE.MathUtils.randFloat(min, max);
};
const getRandomFloatSpread = (range) => {
  return THREE.MathUtils.randFloatSpread(range);
};
// utils: instructions
const displayIns = (ins = STORE.insList, onComplete = null) => {
  clearTimeout(STORE.insTimeout);
  if (!Array.isArray(ins) || ins.length === 0) {
    // reset
    STORE.ins = false;
    STORE.insList = [];
    STORE.insTimeout = null;
    VIEWS.INS.setAttribute("data-title", "");
    VIEWS.INS.setAttribute("data-text", "");
    // end of ins sequence callback
    if (ins.length === 0 && typeof onComplete === "function") {
      onComplete();
    }
    return;
  }
  STORE.ins = true;
  STORE.insList = [...ins];
  const stepData = STORE.insList.shift(); // FIFO
  const { title = "", text = "", timeout = 0, cb = null } = stepData;
  VIEWS.INS.setAttribute("data-title", title);
  VIEWS.INS.setAttribute("data-text", text);
  STORE.insTimeout = setTimeout(() => {
    // step callback
    if (typeof cb === "function") cb();
    // go to next step
    displayIns([...STORE.insList], onComplete);
  }, timeout);
};
// utils: game
const updateChaptor = (chapNum = null) => {
  if (!Number.isFinite(chapNum)) return;
  STORE.chaptor = chapNum;
  localStorage.setItem(LS_KEY.CHAPTOR, chapNum);
};
const advanceChaptor = () => {
  // check modes
  if (STORE.pause || STORE.over || STORE.ins) return;
  const currentChaptor = STORE.chaptor;
  if (!Number.isFinite(currentChaptor) || currentChaptor < 1) return;
  // check score with current chaptor
  if (STORE.chaptorAdvanceScore * currentChaptor > STORE.score) return;
  // get target chaptor and check
  const targetChaptor = currentChaptor + 1;
  if (targetChaptor === STORE.chaptor) return;
  // advance after all checks
  let targetIns;
  switch (targetChaptor) {
    case 2:
      targetIns = INS_CHAP_2;
      break;
    // case 3:
    //   targetIns = INS_CHAP_3;
    //   break;
    // case 4:
    //   targetIns = INS_CHAP_4;
    //   break;
  }
  // start target chap
  if (Array.isArray(targetIns)) displayIns([...targetIns]);
};
const updateScoreToDom = () => {
  VIEWS.SCORE.textContent = `${STORE.score}`;
};
const updateHighScoreToDom = () => {
  VIEWS.HIGH_SCORE.textContent = `${STORE.highScore}`;
};
const updateScoreBy = (score = 0) => {
  STORE.score += score;
  updateScoreToDom();
  advanceChaptor();
};
const toggleTitle = (shown) => {
  const attr = "data-shown";
  let shouldShow;
  if (typeof shown === "boolean") {
    shouldShow = shown;
  } else {
    shouldShow = VIEWS.TITLE.getAttribute(attr) !== "true";
  }
  VIEWS.TITLE.setAttribute(attr, shouldShow ? "true" : "false");
};
const gameOver = () => {
  STORE.over = true;
  STORE.highScore = Math.max(STORE.highScore, STORE.score);
  document.body.setAttribute("data-status", "over");
  updateHighScoreToDom();
  localStorage.setItem(LS_KEY.HIGH_SCORE, `${STORE.highScore}`);
  // title
  toggleTitle(true);
};
const resetGame = () => {
  // reset: ship
  spawnShip(STORE.ship);
  STORE.shipGodMode = GOD_MODE_RESUME_IN_SECS;
  // reset: bullets
  STORE.shipFire.bullets.children.forEach((bullet) => {
    bullet.position.y = camera.top + FORCE_RESPAWN_POS_OFFSET;
  });
  // reset: roids
  STORE.roids.children.forEach((roid) => {
    roid.position.y = camera.bottom - FORCE_RESPAWN_POS_OFFSET;
  });
  // reset: triggs and bullets
  STORE.triggs.children.forEach((trig) => {
    trig.userData.bullets.children.forEach((trigBullet) => {
      trigBullet.position.y = camera.top + FORCE_RESPAWN_POS_OFFSET;
    });
    trig.userData.onDestroy();
  });
  // reset: STORE status
  STORE.over = false;
  STORE.pause = false;
  STORE.score = 0;
  STORE.highScore = getHighScore();
  // reset: chaptor
  // updateChaptor(1); // start from beginning
  // reset: DOM
  document.body.setAttribute("data-status", "");
  updateHighScoreToDom();
  updateScoreBy();
  // title
  toggleTitle(false);
};
// utils: view
const getAspect = () => {
  return window.innerWidth / window.innerHeight;
};
const getThreePosFromWeb = (value, isX) => {
  return isX ? value - window.innerWidth / 2 : window.innerHeight / 2 - value;
};
const isPosAboveCameraX = (posX, buffer = 0) => {
  return posX > camera.right + buffer;
};
const isPosBelowCameraX = (posX, buffer = 0) => {
  return posX < camera.left - buffer;
};
const isPosAboveCameraY = (posY, buffer = 0) => {
  return posY > camera.top + buffer;
};
const isPosBelowCameraY = (posY, buffer = 0) => {
  return posY < camera.bottom - buffer;
};
const isPosOffCameraY = (posY, buffer = 0) => {
  return isPosAboveCameraY(posY, buffer) || isPosBelowCameraY(posY, buffer);
};
const isPosOffCameraX = (posX, buffer = 0) => {
  return isPosAboveCameraX(posX, buffer) || isPosBelowCameraX(posX, buffer);
};
const isPosOffCamera = (posX, posY, bufferX = 0, bufferY = 0) => {
  return (
    isPosAboveCameraX(posX, bufferX) ||
    isPosBelowCameraX(posX, bufferX) ||
    isPosAboveCameraY(posY, bufferY) ||
    isPosBelowCameraY(posY, bufferY)
  );
};
const easeToPos = (currentPos = 0, targetPos = 0, easing = 0.1) => {
  if (currentPos === targetPos) {
    return currentPos;
  }
  return currentPos - (currentPos - targetPos) * easing;
};
const getLatestFrustum = () => {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );
  return frustum;
};
// utils: objects
const getObjectSizes = (obj, scale = new THREE.Vector3(1, 1, 1)) => {
  const bbox = new THREE.Box3().expandByObject(obj);
  return {
    x: Math.ceil(bbox.max.x - bbox.min.x) * scale.x,
    y: Math.ceil(bbox.max.y - bbox.min.y) * scale.y,
    z: Math.ceil(bbox.max.z - bbox.min.z) * scale.z
  };
};
const getScaledObject = (obj, scale = new THREE.Vector3(1, 1, 1)) => {
  const tempBox = new THREE.Box3().expandByObject(obj);
  return new THREE.Box3(
    new THREE.Vector3(
      tempBox.min.x * scale.x,
      tempBox.min.y * scale.y,
      tempBox.min.z * scale.z
    ),
    new THREE.Vector3(
      tempBox.max.x * scale.x,
      tempBox.max.y * scale.y,
      tempBox.max.z * scale.z
    )
  );
};
const collisionUpdateByV2Pos = (objA, objB) => {
  // apply B to A force to A so to pull A away from B
  const vectorB2A = new THREE.Vector2(
    objA.position.x - objB.position.x,
    objA.position.y - objB.position.y
  ).normalize();
  objA.position.x += vectorB2A.x * STORE.roidsCollisionForce;
  objA.position.y += vectorB2A.y * STORE.roidsCollisionForce;
};
// utils: fire
const bulletOnHitCb = (b) => {
  b.removeFromParent();
  b = null;
  delete b;
};
const spawnShipBullet = () => {
  const bullet = new THREE.Points(bulletGeometry, bulletMaterial);
  bullet.position.set(
    STORE.ship.position.x,
    STORE.ship.position.y + SHIP_SIZE / 2,
    SHIP_POS_RESET[2] // STORE.ship.position.z
  );
  bullet.userData.onHit = () => {
    bulletOnHitCb(bullet);
  };
  STORE.shipFire.bullets.add(bullet);
};
const onShipFirstShotFiredCb = () => {
  // dismiss title
  toggleTitle(false);
  // show tutor ins
  if (localStorage.getItem(LS_KEY.CHAPTOR) === null) {
    displayIns([...INS_TUTOR], () => {
      // start chap1
      displayIns([...INS_CHAP_1]);
    });
  }
  // or start chap1 if tutor is done
  else {
    displayIns([...INS_CHAP_1]);
  }
};
const startShipFire = () => {
  STORE.shipFire.on = true;
  if (STORE.shipFire.interval === null) {
    STORE.shipFire.interval = setInterval(() => {
      spawnShipBullet();
      // dismiss title after first shot fired
      if (!STORE.shipFirstShotFired) {
        STORE.shipFirstShotFired = true;
        onShipFirstShotFiredCb();
      }
    }, STORE.shipFire.rate);
  }
};
const stopShipFire = () => {
  clearInterval(STORE.shipFire.interval);
  STORE.shipFire.interval = null;
  STORE.shipFire.on = false;
};
// utils: ship
const getSafeShipPos = (pos, isX) => {
  const halfShipSize = STORE.ship.userData.sizes[isX ? "x" : "y"] / 2;
  const upperBound = isX ? camera.right : camera.top;
  const lowerBound = isX ? camera.left : camera.bottom;
  if (pos + halfShipSize >= upperBound) {
    return upperBound - halfShipSize;
  } else if (pos - halfShipSize <= lowerBound) {
    return lowerBound + halfShipSize;
  } else {
    return pos;
  }
};
const shipOnHitCb = () => {
  // do nothing if already hit
  if (STORE.shipStatus === "HIT" || STORE.shipStatus === "GOD") return;
  // apply hit status and updates
  STORE.shipStatus = "HIT";
  // debug: recover after timeout
  if (STORE.debug) {
    setTimeout(() => {
      STORE.shipStatus = "LIVE";
    }, 1000);
  } else {
    gameOver(); // end of flow
  }
};
const spawnShip = (ship = null, isReset = true) => {
  if (ship === null) {
    // geo
    const geometryShip = new THREE.BoxGeometry(SHIP_SIZE, SHIP_SIZE, SHIP_SIZE);
    const geometryWingLeft = new THREE.BoxGeometry(
      SHIP_SIZE / 2,
      SHIP_SIZE / 2,
      SHIP_SIZE / 2
    );
    const geometryWingRight = new THREE.BoxGeometry(
      SHIP_SIZE / 2,
      SHIP_SIZE / 2,
      SHIP_SIZE / 2
    );
    // mesh: parts
    const meshShipWingLeft = new THREE.Mesh(geometryWingLeft, shipMaterial);
    const meshShipWingRight = new THREE.Mesh(geometryWingRight, shipMaterial);
    meshShipWingLeft.position.set(
      SHIP_SIZE / -2 + SHIP_SIZE / -4,
      SHIP_SIZE / 4,
      SHIP_POS_RESET[2]
    );
    meshShipWingRight.position.set(
      SHIP_SIZE / 4,
      SHIP_SIZE / -2 + SHIP_SIZE / -4,
      SHIP_POS_RESET[2]
    );
    // mesh: ship main
    const meshShip = new THREE.Mesh(geometryShip, shipMaterial);
    meshShip.add(meshShipWingLeft, meshShipWingRight);
    meshShip.scale.set(
      SHIP_SCALE_RESET[0],
      SHIP_SCALE_RESET[1],
      SHIP_SCALE_RESET[2]
    );
    meshShip.rotation.set(
      THREE.MathUtils.degToRad(SHIP_ROTATION_RESET[0]),
      THREE.MathUtils.degToRad(SHIP_ROTATION_RESET[1]),
      THREE.MathUtils.degToRad(SHIP_ROTATION_RESET[2])
    );
    // mesh: debug box
    const meshShipScaledSizes = getObjectSizes(
      meshShip,
      new THREE.Vector3(
        SHIP_DEBUG_SCALE[0],
        SHIP_DEBUG_SCALE[1],
        SHIP_DEBUG_SCALE[2]
      )
    );
    const meshShipScaled = new THREE.Mesh(
      new THREE.BoxGeometry(
        meshShipScaledSizes.x,
        meshShipScaledSizes.y,
        meshShipScaledSizes.z
      )
    );
    const meshShipDebug = new THREE.BoxHelper(meshShipScaled, COLOR_DEBUG);
    if (!STORE.debug) {
      meshShipDebug.material.transparent = true;
      meshShipDebug.material.opacity = 0;
    }
    // ship group
    ship = new THREE.Group();
    ship.add(meshShip, meshShipDebug);
    // custom data
    ship.userData.sizes = getObjectSizes(ship);
    ship.userData.debugSizes = getObjectSizes(meshShipDebug);
    ship.userData.collisionBox = new THREE.Box3();
    ship.userData.onHit = () => {
      shipOnHitCb();
    };
  }
  if (ship && isReset) {
    ship.position.set(SHIP_POS_RESET[0], SHIP_POS_RESET[1], SHIP_POS_RESET[2]);
    // update collision box
    ship.userData.collisionBox.setFromCenterAndSize(
      ship.position,
      ship.userData.debugSizes // use debug box sizes
    );
    // update misc
    STORE.shipStatus = "LIVE";
  }
  return ship;
};
// utils: roids
const roidOnDestroyCb = (roidMesh) => {
  roidMesh.removeFromParent();
  roidMesh = null;
  delete roidMesh;
};
const roidOnFrameCb = (roidMesh) => {
  // Hit by enemy, melting away
  if (roidMesh.userData.status === "MELT") {
    // keep shrinking until 0
    if (roidMesh.scale.x > 0) {
      roidMesh.scale.x -= 0.15;
      roidMesh.scale.y -= 0.15;
      roidMesh.scale.z -= 0.15;
      roidMesh.rotation.x += roidMesh.userData.rotationVectors.x * 10;
      roidMesh.rotation.y += roidMesh.userData.rotationVectors.y * 10;
      roidMesh.rotation.z += roidMesh.userData.rotationVectors.z * 10;
    }
    // then dispose when scale is <= 0
    else {
      roidMesh.userData.onDestroy();
      spawnRoid();
    }
    return;
  }
  // Otherwise, BAU
  const { collisionSphere } = roidMesh.userData;
  // check collision against other roids
  for (let r = STORE.roids.children.length; r > 0; r -= 1) {
    const otherRoid = STORE.roids.children[r - 1];
    if (roidMesh === otherRoid) continue;
    if (collisionSphere.intersectsSphere(otherRoid.userData.collisionSphere)) {
      roidMesh.userData.onHitByOtherRoid(otherRoid);
    }
  }
  // check collison against ship
  const shipCollisionBox = STORE.ship.userData.collisionBox;
  if (collisionSphere.intersectsBox(shipCollisionBox)) {
    STORE.ship.userData.onHit();
  }
  // check collision against ship bullets
  for (let i = STORE.shipFire.bullets.children.length; i > 0; i -= 1) {
    const bullet = STORE.shipFire.bullets.children[i - 1];
    if (collisionSphere.containsPoint(bullet.position)) {
      bullet.userData.onHit();
      roidMesh.userData.onHitByBullet();
      // stop loop
      break;
    }
  }
  // check collision against enemy bullets
  for (let x = STORE.triggs.children.length; x > 0; x -= 1) {
    const trig = STORE.triggs.children[x - 1];
    for (let y = trig.userData.bullets.children.length; y > 0; y -= 1) {
      const trigBullet = trig.userData.bullets.children[y - 1];
      if (collisionSphere.containsPoint(trigBullet.position)) {
        trigBullet.userData.onHit();
        roidMesh.userData.onHitByEnemyBullet();
        // stop loop
        break;
      }
    }
  }
  // rotation
  roidMesh.rotation.x += roidMesh.userData.rotationVectors.x;
  roidMesh.rotation.y += roidMesh.userData.rotationVectors.y;
  roidMesh.rotation.z += roidMesh.userData.rotationVectors.z;
  // movement
  roidMesh.position.y += roidMesh.userData.moveVectorY;
  // finally, update collision sphere with global position
  roidMesh.userData.collisionSphere.set(
    roidMesh.position,
    roidMesh.userData.collisionSize
  );
  // respawn detection
  if (
    isPosBelowCameraY(
      roidMesh.position.y,
      (ROID_SIZE * roidMesh.userData.scale) / 2
    )
  ) {
    const lastPosY = roidMesh.position.y;
    roidMesh.userData.onDestroy();
    spawnRoid();
    // game
    if (lastPosY > -FORCE_RESPAWN_POS_OFFSET) {
      // exclude game reset roid shifts
      updateScoreBy(STORE.scoreIncrementRoid);
    }
  }
};
const roidOnHitByBulletCb = (roidMesh) => {
  roidMesh.position.y += ROID_HIT_POS_DETER;
};
const roidOnHitByEnemyBulletCb = (roidMesh) => {
  roidMesh.userData.status = "MELT";
  // infalte the scale to dramatize the shrink animation
  roidMesh.scale.x *= 1.2;
  roidMesh.scale.y *= 1.2;
  roidMesh.scale.z *= 1.2;
};
const roidOnHitByOtherRoidCb = (thisRoid, otherRoid) => {
  collisionUpdateByV2Pos(thisRoid, otherRoid);
};
const spawnRoid = () => {
  const roidMesh = new THREE.Mesh(roidGeometry, roidMaterial);
  roidMesh.position.set(
    getRandomIntFromRange(camera.left, camera.right),
    getRandomIntFromRange(camera.bottom, camera.top) + camera.top * 2, // make sure starts above screen
    ROID_POS_Z
  );
  const scale = getRandomIntFromRange(ROID_SCALE[0], ROID_SCALE[1]);
  roidMesh.scale.set(scale, scale, scale);
  // data
  roidMesh.userData.status = "LIVE"; // 'MELT': hit by enemy
  roidMesh.userData.moveVectorY = STORE.roidsMoveVectorY[1] / (5 * scale);
  const rotationVectorX = getRandomIntFromRange(-3, 3) / (100 * scale);
  const rotationVectorY = getRandomIntFromRange(-3, 3) / (100 * scale);
  const rotationVectorZ = getRandomIntFromRange(-3, 3) / (100 * scale);
  roidMesh.userData.rotationVectors = {
    x:
      Math.abs(rotationVectorX) > ROID_ROTATION_VECTOR_MIN
        ? rotationVectorX
        : ROID_ROTATION_VECTOR_MIN, // avoid 0 rotation
    y:
      Math.abs(rotationVectorY) > ROID_ROTATION_VECTOR_MIN
        ? rotationVectorY
        : ROID_ROTATION_VECTOR_MIN,
    z:
      Math.abs(rotationVectorZ) > ROID_ROTATION_VECTOR_MIN
        ? rotationVectorZ
        : ROID_ROTATION_VECTOR_MIN
  };
  roidMesh.userData.scale = scale;
  roidMesh.userData.collisionSize =
    ROID_SIZE * ROID_SIZE_COLLISION_DISCOUNT * scale;
  roidMesh.userData.collisionSphere = new THREE.Sphere(
    roidMesh.position,
    roidMesh.userData.collisionSize
  );
  roidMesh.userData.onDestroy = () => {
    roidOnDestroyCb(roidMesh);
  };
  roidMesh.userData.onFrame = () => {
    roidOnFrameCb(roidMesh);
  };
  roidMesh.userData.onHitByBullet = () => {
    roidOnHitByBulletCb(roidMesh);
  };
  roidMesh.userData.onHitByEnemyBullet = () => {
    roidOnHitByEnemyBulletCb(roidMesh);
  };
  roidMesh.userData.onHitByOtherRoid = (otherRoid) => {
    roidOnHitByOtherRoidCb(roidMesh, otherRoid);
  };
  STORE.roids.add(roidMesh);
  return roidMesh;
};
const spawnRoids = () => {
  Array(ROID_COUNT)
    .fill("")
    .forEach(() => {
      spawnRoid();
    });
};
// utils: stars
const respawnStar = (s) => {
  const posXFactor = STORE.shipFirstShotFired ? 1 : 0.2;
  s.position.set(
    getRandomIntFromRange(camera.left * posXFactor, camera.right * posXFactor),
    getRandomIntFromRange(camera.bottom, camera.top) + camera.top * 2, // make sure starts above screen
    0
  );
  const vectorYFactor = STORE.shipFirstShotFired ? 1 : 2;
  s.userData.moveVectorY = getRandomIntFromRange(
    STORE.starsMoveVectorY[0],
    STORE.starsMoveVectorY[1] * vectorYFactor
  );
  s.material.opacity =
    (s.userData.moveVectorY - STORE.starsMoveVectorY[0]) /
    (STORE.starsMoveVectorY[1] - STORE.starsMoveVectorY[0]);
};
const spawnStars = (star = null) => {
  if (star !== null) {
    respawnStar(star);
  } else {
    Array(STAR_COUNT)
      .fill("")
      .forEach(() => {
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute([0, 0, STAR_POS_Z], 3) // need to offset Z to be seen
        );
        const starMaterial = new THREE.PointsMaterial({
          color: COLORS.BLACK,
          size: STAR_SIZE,
          sizeAttenuation: false,
          transparent: true
        });
        const star = new THREE.Points(starGeometry, starMaterial);
        respawnStar(star);
        STORE.stars.add(star);
      });
  }
};
// utils: triggs
const shiftTrigg = (trigg = null) => {
  if (!trigg) return;
  // set target pos and vector
  const posBorderBuffer = 10;
  trigg.userData.targetPos.x = getRandomIntFromRange(
    Math.floor(camera.left) + posBorderBuffer * 5,
    Math.floor(camera.right) - posBorderBuffer * 5
  );
  // make sure there's enough room for:
  // 1. top: UI
  // 2. bottom: ship can still shoot trigg
  trigg.userData.targetPos.y = getRandomIntFromRange(
    Math.floor(camera.top) - posBorderBuffer * 10,
    Math.floor(camera.bottom) + STORE.ship.userData.sizes.y * 4
  );
  // Note: this data is now redundant with position easing
  trigg.userData.targetVector = new THREE.Vector2(
    trigg.userData.targetPos.x - trigg.position.x,
    trigg.userData.targetPos.y - trigg.position.y
  ).normalize();
  // reset shiftTimeout
  clearTimeout(trigg.userData.shiftTimeout);
  trigg.userData.shiftTimeout = null;

  return trigg;
};
const onTrigFireCb = (trig) => {
  // no fire when
  if (
    // game status
    STORE.pause ||
    STORE.over ||
    // trig status
    trig.userData.life <= 0 ||
    trig.userData.shiftTimeout === null
  ) {
    return;
  }
  // fire new bullet
  const bulletMat =
    trig.userData.lastBulletMat === triggsBulletMaterial
      ? triggsBulletMaterialAlt
      : triggsBulletMaterial;
  const trigBullet = new THREE.Points(bulletGeometry, bulletMat);
  trig.userData.lastBulletMat = bulletMat;
  trig.userData.bullets.add(trigBullet);
  // origin
  trigBullet.position.set(trig.position.x, trig.position.y, TRIG_BULLET_POS_Z);
  // aim data
  trigBullet.userData.aimVector = new THREE.Vector2(
    STORE.ship.position.x -
      trig.position.x +
      getRandomFloatSpread(TRIG_AIM_BIAS),
    STORE.ship.position.y -
      trig.position.y +
      getRandomFloatSpread(TRIG_AIM_BIAS)
  ).normalize();
  // onHit
  trigBullet.userData.onHit = () => {
    onTrigBulletHitCd(trigBullet);
  };
};
const onTrigHitByBulletCb = (trig) => {
  trig.userData.life -= 1;
  if (trig.userData.life === 0) {
    trig.userData.onDestroy(true);
  }
  // visual update
  trig.material = trigMaterialHit;
  clearTimeout(trig.userData.hitVisualTimeout);
  trig.userData.hitVisualTimeout = setTimeout(() => {
    trig.material = trigMaterial;
    trig.userData.hitVisualTimeout = null;
  }, STORE.enemyHitVisualTimeout);
};
const onTrigDestroyCb = (trig, updateScore = false) => {
  trig.userData.life = 0;
  // firing
  clearInterval(trig.userData.firingInterval);
  trig.userData.firingInterval = null;
  // score
  if (updateScore) {
    updateScoreBy(STORE.scoreIncrementTrigg);
  }
};
const onTrigDisposeCb = (trig) => {
  onTrigDestroyCb(trig);
  trig.removeFromParent();
  trig = null;
  delete trig;
};
const onTrigFrameCb = (trig) => {
  // live
  if (trig.userData.life > 0) {
    const { collisionSphere } = trig.userData;
    // check collison against ship
    const shipCollisionBox = STORE.ship.userData.collisionBox;
    if (collisionSphere.intersectsBox(shipCollisionBox)) {
      STORE.ship.userData.onHit();
    }
    // check collision against ship bullets
    for (let i = STORE.shipFire.bullets.children.length; i > 0; i -= 1) {
      const bullet = STORE.shipFire.bullets.children[i - 1];
      if (collisionSphere.containsPoint(bullet.position)) {
        bullet.userData.onHit();
        trig.userData.onHitByBullet();
        // stop loop
        break;
      }
    }
    // rotation
    trig.rotation.z += TRIG_ROTATION_VECTOR;
    // position
    const disToTarget = trig.userData.targetPos.distanceTo(
      new THREE.Vector2(trig.position.x, trig.position.y)
    );
    if (disToTarget < TRIG_SHIFT_SPEED) {
      // if close enough, shift again
      if (trig.userData.shiftTimeout === null) {
        trig.userData.shiftTimeout = setTimeout(() => {
          shiftTrigg(trig);
        }, getRandomIntFromRange(TRIG_SHIFT_TIMEOUT_RANGE[0], TRIG_SHIFT_TIMEOUT_RANGE[1]));
      }
    } else {
      // otherwise, keep easing towards target pos
      trig.position.x = easeToPos(
        trig.position.x,
        trig.userData.targetPos.x,
        0.06
      );
      trig.position.y = easeToPos(
        trig.position.y,
        trig.userData.targetPos.y,
        0.06
      );
      // linear
      // trig.position.x += trig.userData.targetVector.x * TRIG_SHIFT_SPEED;
      // trig.position.y += trig.userData.targetVector.y * TRIG_SHIFT_SPEED;
    }
    // finally, update collision sphere with global position
    trig.userData.collisionSphere.set(
      new THREE.Vector3(trig.position.x, trig.position.y, TRIG_BULLET_POS_Z),
      trig.userData.collisionSize
    );
  }
  // dead
  else {
    // invalidate collisionSphere
    if (trig.userData.collisionSphere !== null) {
      trig.userData.collisionSphere = null;
    }
    // keep shrinking until 0
    if (trig.scale.x > 0) {
      trig.scale.x -= 0.1;
      trig.scale.y -= 0.1;
      trig.scale.z -= 0.1;
    }
    // then dispose after all bullets are gone
    else if (trig.userData.bullets.children.length === 0) {
      trig.removeFromParent();
      trig = null;
      delete trig;
      // respawn trigg
      spawnTrigg();
    }
  }
};
const onTrigBulletHitCd = (tb) => {
  tb.removeFromParent();
  tb = null;
  delete tb;
};
const onTrigBulletsFrameCb = (trig) => {
  trig.userData.bullets.children.forEach((b) => {
    // collision against ship
    if (STORE.ship.userData.collisionBox.containsPoint(b.position)) {
      STORE.ship.userData.onHit();
    }
    // movement
    const newPosX = b.position.x + b.userData.aimVector.x * 5;
    const newPosY = b.position.y + b.userData.aimVector.y * 5;
    if (
      isPosOffCamera(
        newPosX,
        newPosY,
        TRIG_BULLET_SIZE / 2,
        TRIG_BULLET_SIZE / 2
      )
    ) {
      onTrigBulletHitCd(b);
    } else {
      b.position.x = newPosX;
      b.position.y = newPosY;
    }
  });
};
const spawnTrigg = () => {
  const trigMesh = new THREE.Mesh(trigGeometry, trigMaterial);
  trigMesh.position.set(
    getRandomIntFromRange(camera.left, camera.right),
    camera.top +
      getRandomIntFromRange(TRIG_OUTER_SIZE * 2, TRIG_OUTER_SIZE * 4),
    TRIG_POZ_Z
  );
  // custom data
  trigMesh.userData.life = TRIG_LIFE; // triggs life status
  trigMesh.userData.targetPos = new THREE.Vector2(0, 0);
  trigMesh.userData.targetVector = new THREE.Vector2(0, 0);
  trigMesh.userData.shiftTimeout = null;
  trigMesh.userData.hitVisualTimeout = null;
  trigMesh.userData.aimVector = new THREE.Vector2(0, 0);
  trigMesh.userData.bullets = new THREE.Group();
  trigMesh.userData.lastBulletMat = triggsBulletMaterialAlt;
  trigMesh.userData.collisionSize =
    TRIG_OUTER_SIZE * TRIG_SIZE_COLLISION_DISCOUNT;
  trigMesh.userData.collisionSphere = new THREE.Sphere(
    new THREE.Vector3(
      trigMesh.position.x,
      trigMesh.position.y,
      TRIG_BULLET_POS_Z
    ),
    trigMesh.userData.collisionSize
  );
  // custom callbacks
  trigMesh.userData.onFire = () => {
    onTrigFireCb(trigMesh);
  };
  trigMesh.userData.onHitByBullet = () => {
    onTrigHitByBulletCb(trigMesh);
  };
  trigMesh.userData.onDestroy = (updateScore = false) => {
    onTrigDestroyCb(trigMesh, updateScore);
  };
  trigMesh.userData.onDispose = () => {
    onTrigDisposeCb(trigMesh);
  };
  trigMesh.userData.onFrame = () => {
    onTrigFrameCb(trigMesh);
    onTrigBulletsFrameCb(trigMesh);
  };
  // firing
  trigMesh.userData.firingInterval = setInterval(
    trigMesh.userData.onFire,
    TRIG_FIRE_RATE
  );
  // initial spawn shift
  shiftTrigg(trigMesh);
  // add to scene
  scene.add(trigMesh.userData.bullets);
  STORE.triggs.add(trigMesh);
};
const spawnTriggs = () => {
  Array(TRIG_COUNT)
    .fill("")
    .forEach(() => {
      spawnTrigg();
    });
};

// -------------------------------------------------------------
// setup: stats
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
if (STORE.debug) {
  document.body.appendChild(stats.dom);
}
// setup: cam
const camera = new THREE.OrthographicCamera(...CAM_BOUNDS());
// setup: renderer
const renderer = new THREE.WebGLRenderer({
  canvas: VIEWS.MAIN,
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
// setup: scene
const scene = new THREE.Scene();
// setup: window resize
const onWindowResize = () => {
  const latestCameraBounds = CAM_BOUNDS();
  camera.left = latestCameraBounds[0];
  camera.right = latestCameraBounds[1];
  camera.top = latestCameraBounds[2];
  camera.bottom = latestCameraBounds[3];
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener("resize", onWindowResize);
// setup: touch/mouse events
const onMouseDown = (e) => {
  if (e.button > 0) return;
  startShipFire();
};
const onTouchStart = (e) => {
  if (e.touches.length === 1) {
    startShipFire();
  } else if (e.touches.length === 2 && STORE.over) {
    resetGame();
  }
};
const onMouseUp = (e) => {
  if (e.button > 0) return;
  stopShipFire();
};
const onTouchEnd = (e) => {
  stopShipFire();
};
const onMouseMove = (e) => {
  STORE.shipPos.x = getSafeShipPos(getThreePosFromWeb(e.clientX, true), true);
  STORE.shipPos.y = getSafeShipPos(getThreePosFromWeb(e.clientY, false), false);
};
const onTouchMove = (e) => {
  if (e.touches.length !== 1) return;
  STORE.shipPos.x = getSafeShipPos(
    getThreePosFromWeb(e.touches[0].clientX, true),
    true
  );
  STORE.shipPos.y = getSafeShipPos(
    getThreePosFromWeb(e.touches[0].clientY, false),
    false
  );
};
const onMouseOut = (e) => {
  // onMouseOut is fired when moving out of all DOM nodes
  if (e.toElement === null) {
    stopShipFire();
  }
};
const onTouchCancel = (e) => {
  stopShipFire();
};
const onMouseDblClick = (e) => {
  if (e.button > 0) return;
  if (STORE.over) {
    resetGame();
  }
};
if (IS_TOUCH) {
  document.addEventListener("touchstart", onTouchStart, true);
  document.addEventListener("touchend", onTouchEnd, true);
  document.addEventListener(
    "touchmove",
    throttleFunction(onTouchMove, 10),
    true
  );
  document.addEventListener("touchcancel", onTouchCancel, true);
} else {
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("mouseup", onMouseUp, true);
  document.addEventListener(
    "mousemove",
    throttleFunction(onMouseMove, 10),
    true
  );
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("dblclick", onMouseDblClick, true);
}
// setup: keyboard events
const onKeyDown = (e) => {
  switch (e.code) {
    case "ArrowDown":
      STORE.shipNav.down = true;
      break;
    case "ArrowUp":
      STORE.shipNav.up = true;
      break;
    case "ArrowLeft":
      STORE.shipNav.left = true;
      break;
    case "ArrowRight":
      STORE.shipNav.right = true;
      break;
    case "Space":
      if (!STORE.shipFire.on) {
        startShipFire();
      }
      break;
    default:
      return;
  }
};
document.addEventListener("keydown", onKeyDown, true);
const onKeyUp = (e) => {
  switch (e.code) {
    case "ArrowDown":
      STORE.shipNav.down = false;
      break;
    case "ArrowUp":
      STORE.shipNav.up = false;
      break;
    case "ArrowLeft":
      STORE.shipNav.left = false;
      break;
    case "ArrowRight":
      STORE.shipNav.right = false;
      break;
    case "Space":
      stopShipFire();
      break;
    case "Escape":
      if (STORE.ins || STORE.over || !STORE.shipFirstShotFired) return;
      STORE.pause = !STORE.pause;
      if (STORE.pause === false) {
        STORE.shipGodMode = GOD_MODE_RESUME_IN_SECS;
      }
      document.body.setAttribute("data-status", STORE.pause ? "pause" : "");
      // title
      toggleTitle(STORE.pause);
      break;
    case "Enter":
      if (STORE.over) {
        resetGame();
      }
      break;
    default:
      return;
  }
};
document.addEventListener("keyup", onKeyUp, true);
// setup: game
updateHighScoreToDom();
updateScoreBy();
// setup: bullet
const bulletGeometry = new THREE.BufferGeometry();
bulletGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute([0, 0, BULLET_POS_Z], 3) // need to offset Z to be seen
);
const bulletMaterial = new THREE.PointsMaterial({
  color: COLORS.BLACK,
  size: BULLET_SIZE,
  sizeAttenuation: false
});
scene.add(STORE.shipFire.bullets);
// setup: ship
const debugMeshMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.BLACK,
  wireframe: true
});
const shipMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.BLACK
});
if (STORE.ship === null) {
  STORE.ship = spawnShip();
}
scene.add(STORE.ship);
// setup: roids
const roidGeometry = new THREE.OctahedronGeometry(ROID_SIZE, 0);
const roidMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.BLACK,
  wireframe: true
});
// setup: stars
spawnStars();
scene.add(STORE.stars);
// setup: triggs
const trigGeometry = new THREE.RingGeometry(TRIG_SIZE, TRIG_OUTER_SIZE, 1, 0);
trigGeometry.rotateZ(THREE.MathUtils.degToRad(-90)); // point downwards
const trigMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.RED_KISS
});
const trigMaterialHit = new THREE.MeshBasicMaterial({
  color: COLORS.RED_KISS,
  wireframe: true
});
const triggsBulletMaterial = new THREE.PointsMaterial({
  color: COLORS.LASER_RED,
  size: TRIG_BULLET_SIZE,
  sizeAttenuation: false
});
const triggsBulletMaterialAlt = new THREE.PointsMaterial({
  color: COLORS.LASER_PINK,
  size: TRIG_BULLET_SIZE,
  sizeAttenuation: false
});

// -------------------------------------------------------------
// view models
// control
const hasDirKeyDown = () =>
  Object.values(STORE.shipNav).some((val) => val === true);
// ship
const updateKeyControlsToShipPos = () => {
  if (STORE.shipNav.left) {
    STORE.shipPos.x -= SHIP_MOVEMENT_KEYBOARD_INCREMENT;
  }
  if (STORE.shipNav.right) {
    STORE.shipPos.x += SHIP_MOVEMENT_KEYBOARD_INCREMENT;
  }
  if (STORE.shipNav.up) {
    STORE.shipPos.y += SHIP_MOVEMENT_KEYBOARD_INCREMENT;
  }
  if (STORE.shipNav.down) {
    STORE.shipPos.y -= SHIP_MOVEMENT_KEYBOARD_INCREMENT;
  }
  // keep in bounds
  STORE.shipPos.x = getSafeShipPos(STORE.shipPos.x, true);
  STORE.shipPos.y = getSafeShipPos(STORE.shipPos.y, false);
};

// -------------------------------------------------------------
// render
const render = () => {
  const { ship, shipFire, roids, stars, triggs } = STORE;
  // bullets
  shipFire.bullets.children.forEach((bullet) => {
    const newPosY = bullet.position.y + shipFire.moveVectorY;
    if (isPosAboveCameraY(newPosY, BULLET_SIZE / 2)) {
      bullet.removeFromParent();
      bullet = null;
      delete bullet;
    } else {
      bullet.position.y = newPosY;
    }
  });
  // ship: god mode
  if (STORE.shipGodMode >= GOD_MODE_MIN_IN_SECS) {
    const timeout = STORE.shipGodMode * 1000;
    STORE.shipGodMode = 0; // back to 0 so won't execute this again
    // update ship to god mode
    STORE.shipStatus = "GOD";
    STORE.ship.position.z = SHIP_POS_GOD_MODE[2];
    shipMaterial.color.set(COLOR_GOD_MODE);
    // flash ship before full timeout
    for (
      let flashTimeout = GOD_MODE_FLASH_TIMEOUT;
      flashTimeout <= GOD_MODE_FLASHES_TIMEOUT;
      flashTimeout += GOD_MODE_FLASH_TIMEOUT
    ) {
      setTimeout(() => {
        shipMaterial.color.set(
          shipMaterial.color.equals(new THREE.Color(COLORS.BLACK))
            ? COLOR_GOD_MODE
            : COLORS.BLACK
        );
      }, timeout - flashTimeout);
    }
    // revert ship to default after full timeout
    setTimeout(() => {
      STORE.shipStatus = "LIVE";
      STORE.ship.position.z = SHIP_POS_RESET[2];
      shipMaterial.color.set(COLORS.BLACK);
    }, timeout);
  }
  // ship: control movement
  const isDirKeyDown = hasDirKeyDown();
  isDirKeyDown && updateKeyControlsToShipPos();
  ship.position.x = isDirKeyDown
    ? STORE.shipPos.x
    : easeToPos(ship.position.x, STORE.shipPos.x);
  ship.position.y = isDirKeyDown
    ? STORE.shipPos.y
    : easeToPos(ship.position.y, STORE.shipPos.y);
  // ship: sync updates to collisionBox
  ship.userData.collisionBox.setFromCenterAndSize(
    ship.position,
    ship.userData.debugSizes // use debug box sizes
  );
  // roids
  roids.children.forEach((roid) => {
    const { onFrame } = roid.userData;
    onFrame();
  });
  // stars
  stars.children.forEach((star) => {
    const newPosY = star.position.y + star.userData.moveVectorY;
    if (isPosBelowCameraY(newPosY, STAR_SIZE / 2)) {
      respawnStar(star);
    } else {
      star.position.y = newPosY;
    }
  });
  // triggs
  triggs.children.forEach((trig) => {
    trig.userData.onFrame();
  });

  // render
  renderer.render(scene, camera);
};

// -------------------------------------------------------------
// init and loop
const animateLoop = function () {
  requestAnimationFrame(animateLoop);
  if (STORE.debug) stats.begin();
  if (!STORE.pause && !STORE.over) render();
  if (STORE.debug) stats.end();
};
const init = () => {
  animateLoop();
  toggleTitle(true);
};
init();
