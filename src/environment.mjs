import * as THREE from 'three';
import { physicsWorld } from './physics.mjs';
import { hoopY, hoopZ, hoopRadius, backboardY, backboardZ, roomWidth, roomDepth, roomHeight } from './constants.mjs';


// ----- Room Setup -----
export function createRoom(scene) {
    createFloor(scene);

    // 4 walls, each ~0.2m thick, double-sided so they're visible from inside
    createWall({
        // front wall at z = +2
        width: roomWidth,
        height: roomHeight,
        thickness: 0.2,
        center: new THREE.Vector3(0, roomHeight / 2, 2),
        color: 0xa0a0a0
    }, scene);
    createWall({
        // back wall at z = -5
        width: roomWidth,
        height: roomHeight,
        thickness: 0.2,
        center: new THREE.Vector3(0, roomHeight / 2, -5),
        color: 0xa0a0a0
    }, scene);
    createWall({
        // left wall at x = -4
        width: roomDepth,
        height: roomHeight,
        thickness: 0.2,
        center: new THREE.Vector3(-4, roomHeight / 2, -(roomDepth / 2 - 2)),
        color: 0xa0a0a0,
        rotateY: Math.PI / 2
    }, scene);
    createWall({
        // right wall at x = +4
        width: roomDepth,
        height: roomHeight,
        thickness: 0.2,
        center: new THREE.Vector3(4, roomHeight / 2, -(roomDepth / 2 - 2)),
        color: 0xa0a0a0,
        rotateY: -Math.PI / 2
    }, scene);

    createHoop(scene); // attach hoop/backboard near the back wall
}

function createFloor(scene) {
    // Floor (8x7), top at y=0
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    // center the floor so front edge is z=+2, back edge is z=-5
    floorMesh.position.z = -(roomDepth / 2 - 2);
    scene.add(floorMesh);

    // Floor physics
    const floorShape = new Ammo.btBoxShape(new Ammo.btVector3(roomWidth / 2, 0.5, roomDepth / 2));
    floorShape.setMargin(0.01);

    const floorTransform = new Ammo.btTransform();
    floorTransform.setIdentity();
    floorTransform.setOrigin(new Ammo.btVector3(0, -0.5, -(roomDepth / 2 - 2)));
    const floorMotionState = new Ammo.btDefaultMotionState(floorTransform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, floorMotionState, floorShape, new Ammo.btVector3(0, 0, 0));
    const floorBody = new Ammo.btRigidBody(rbInfo);

    // Set restitution of the floor (optional)
    floorBody.setRestitution(0.7); // Adjust as needed

    physicsWorld.addRigidBody(floorBody);
}

function createWall({ width, height, thickness, center, color, rotateY = 0 }, scene) {
    // Three.js Mesh
    const wallGeom = new THREE.BoxGeometry(width, height, thickness);
    const wallMat = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide // so it's visible from inside the room
    });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.copy(center);
    wallMesh.rotation.y = rotateY;
    scene.add(wallMesh);

    // Ammo shape
    // half extents = (width/2, height/2, thickness/2)
    // If we rotated around Y, we still treat the shape the same, but set the transform's rotation
    const halfW = width / 2;
    const halfH = height / 2;
    const halfT = thickness / 2;

    const wallShape = new Ammo.btBoxShape(new Ammo.btVector3(halfW, halfH, halfT));
    wallShape.setMargin(0.01);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(center.x, center.y, center.z));

    // Rotate in Ammo if needed
    if (rotateY !== 0) {
        const quat = new THREE.Quaternion();
        quat.setFromEuler(new THREE.Euler(0, rotateY, 0));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    }

    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, wallShape, new Ammo.btVector3(0, 0, 0));
    const body = new Ammo.btRigidBody(rbInfo);
    physicsWorld.addRigidBody(body);
}

// ----- Hoop / Backboard -----
function createHoop(scene) {
    // Hoop ring (visual)
    const hoopGeometry = new THREE.TorusGeometry(hoopRadius, 0.02, 16, 32);
    const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff4400 });
    const hoopMesh = new THREE.Mesh(hoopGeometry, hoopMaterial);
    hoopMesh.rotation.x = Math.PI / 2;
    hoopMesh.position.set(0, hoopY, hoopZ);
    scene.add(hoopMesh);

    // Backboard
    const backboardGeometry = new THREE.BoxGeometry(1, 0.8, 0.05);
    const backboardMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const backboardMesh = new THREE.Mesh(backboardGeometry, backboardMaterial);
    backboardMesh.position.set(0, backboardY, backboardZ);
    scene.add(backboardMesh);

    // Create hoop physics - using compound shape for better collision
    const compoundShape = new Ammo.btCompoundShape();

    // Add ring segments (8 segments to approximate the circle)
    const segments = 8;
    const segmentAngle = (2 * Math.PI) / segments;
    const tubeRadius = 0.02; // Thickness of the hoop ring

    for (let i = 0; i < segments; i++) {
        const angle = i * segmentAngle;
        const nextAngle = (i + 1) * segmentAngle;

        const x1 = Math.cos(angle) * hoopRadius;
        const z1 = Math.sin(angle) * hoopRadius;
        const x2 = Math.cos(nextAngle) * hoopRadius;
        const z2 = Math.sin(nextAngle) * hoopRadius;

        // Create a box shape for each segment
        const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        const segmentShape = new Ammo.btBoxShape(new Ammo.btVector3(segmentLength / 2, tubeRadius, tubeRadius));

        const segmentTransform = new Ammo.btTransform();
        segmentTransform.setIdentity();

        // Position at midpoint of segment
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        segmentTransform.setOrigin(new Ammo.btVector3(midX, hoopY, midZ + hoopZ));

        // Rotate to align with segment
        const rotation = Math.atan2(z2 - z1, x2 - x1);
        const quat = new Ammo.btQuaternion();
        quat.setRotation(new Ammo.btVector3(0, 1, 0), rotation);
        segmentTransform.setRotation(quat);

        compoundShape.addChildShape(segmentTransform, segmentShape);
    }

    // Add backboard physics
    const backboardShape = new Ammo.btBoxShape(new Ammo.btVector3(0.5, 0.4, 0.025));
    const backboardTransform = new Ammo.btTransform();
    backboardTransform.setIdentity();
    backboardTransform.setOrigin(new Ammo.btVector3(0, backboardY, backboardZ));
    compoundShape.addChildShape(backboardTransform, backboardShape);

    // Create rigid body for compound shape
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, compoundShape, new Ammo.btVector3(0, 0, 0));
    const body = new Ammo.btRigidBody(rbInfo);

    // Set physics properties
    body.setRestitution(0.3);
    body.setFriction(0.3);
    body.setRollingFriction(0.1);

    physicsWorld.addRigidBody(body);
}