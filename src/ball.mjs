import * as THREE from 'three';
import { physicsWorld, transformAux1 } from './physics.mjs';
import { ballRadius, throwMultiplier, arcFactor, maxHistory, hoopY, hoopZ, hoopRadius } from './constants.mjs';
import { controllerData, controller1, controller2 } from './controllers.mjs';
import { updateScore } from './score.mjs';

export let currentBall = null;
export let ballBody = null;
export let lastBallYPosition;
export const rigidBodies = [];

const params = {
  ballMass: 1,
  spawnPosition: new THREE.Vector3(0.3, 1.3, -1) // slightly in front & to the right
};

export function spawnBall(scene) {
  const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
  const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.castShadow = true;
  ball.position.copy(params.spawnPosition);

  const shape = new Ammo.btSphereShape(ballRadius);
  shape.setMargin(0.01);

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(ball.position.x, ball.position.y, ball.position.z));

  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);
  shape.calculateLocalInertia(params.ballMass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(params.ballMass, motionState, shape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);
  
  body.setRestitution(0.8);
  body.setFriction(0.5);
  body.setRollingFriction(0.1);
  body.setDamping(0.1, 0.1);

  body.setActivationState(4); // DISABLE_DEACTIVATION
  body.setCollisionFlags(0);
  
  body.setLinearFactor(new Ammo.btVector3(0, 0, 0));
  body.setAngularFactor(new Ammo.btVector3(0, 0, 0));

  physicsWorld.addRigidBody(body);
  ball.userData = { physicsBody: body };
  scene.add(ball);
  rigidBodies.push(ball);

  currentBall = ball;
  ballBody = body;
  lastBallYPosition = currentBall.position.y;
}

function isNearController(ball, controller) {
  const ctrlPos = new THREE.Vector3();
  controller.getWorldPosition(ctrlPos);
  const distance = ball.position.distanceTo(ctrlPos);
  return distance < 0.3 && !controller.userData.isHolding;
}

export function onSelectStart(event) {
  const controller = event.target;
  if (!currentBall || controller.userData.isHolding) return;

  if (isNearController(currentBall, controller)) {
    controller.userData.isHolding = true;
    controller.userData.heldBall = currentBall;

    const side = controller === controller1 ? "left" : "right";
    controllerData[side].isHolding = true;
    controllerData[side].positionHistory = [];

    const body = currentBall.userData.physicsBody;
    body.setLinearFactor(new Ammo.btVector3(1, 1, 1));
    body.setAngularFactor(new Ammo.btVector3(1, 1, 1));
    
    body.activate(true);
    body.setActivationState(4);
  }
}

export function onSelectEnd(event, scene) {

  const controller = event.target;
  if (!controller.userData.isHolding) return;

  const side = controller === controller1 ? "left" : "right";
  const ball = controller.userData.heldBall;
  const body = ball.userData.physicsBody;

  const vel = controllerData[side].velocity.clone().multiplyScalar(throwMultiplier);

  const flatSpeed = new THREE.Vector3(vel.x, 0, vel.z).length();
  vel.y += flatSpeed * arcFactor;

  body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));

  controller.userData.isHolding = false;
  controller.userData.heldBall = null;
  controllerData[side].isHolding = false;

  setTimeout(() => spawnBall(scene), 3000);
}

export function updatePhysics(deltaTime, scene) {
  physicsWorld.stepSimulation(deltaTime, 10);

  for (let i = 0; i < rigidBodies.length; i++) {
    const objThree = rigidBodies[i];
    const objPhys = objThree.userData.physicsBody;
    const ms = objPhys.getMotionState();
    if (ms) {
      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }

  // Update controller data and held ball positions
  [controller1, controller2].forEach((ctrl) => {
    if (!ctrl.userData.isHolding || !ctrl.userData.heldBall) return;

    const side = ctrl === controller1 ? "left" : "right";
    const ball = ctrl.userData.heldBall;
    const body = ball.userData.physicsBody;

    const ctrlPos = new THREE.Vector3();
    ctrl.getWorldPosition(ctrlPos);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(ctrlPos.x, ctrlPos.y, ctrlPos.z));
    body.setWorldTransform(transform);

    const history = controllerData[side].positionHistory;
    history.push(ctrlPos.clone());
    if (history.length > maxHistory) history.shift();

    if (history.length > 1) {
      let totalVel = new THREE.Vector3();
      for (let i = 1; i < history.length; i++) {
        const curr = history[i], prev = history[i-1];
        totalVel.add(curr.clone().sub(prev));
      }
      totalVel.divideScalar(history.length - 1).multiplyScalar(60);
      controllerData[side].velocity.copy(totalVel);
    }
  });

  // Scoring check
  if (currentBall) {
    const pos = currentBall.position;

    if (lastBallYPosition !== undefined) {
      if (
        lastBallYPosition > hoopY && pos.y <= hoopY &&
        Math.sqrt((pos.x) ** 2 + (pos.z - hoopZ) ** 2) <= hoopRadius
      ) {
        updateScore(scene);
        currentBall = null;
        lastBallYPosition = undefined;
      } else {
        lastBallYPosition = pos.y;
      }
    } else {
      lastBallYPosition = pos.y;
    }
  } else {
    lastBallYPosition = undefined;
  }
}