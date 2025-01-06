import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { initPhysics} from './physics.mjs';
import { createRoom } from './environment.mjs';
import { initControllers } from './controllers.mjs';
import { spawnBall, updatePhysics } from './ball.mjs';
import { initScoreDisplay } from './score.mjs';



let camera, scene, renderer;



Ammo().then(function (AmmoLib) {
    Ammo = AmmoLib;
    init();
});

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // open sky

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add a second directional light from a different angle
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-10, 10, -10);
    scene.add(dirLight2);

    initPhysics();
    initScoreDisplay(scene);
    createRoom(scene);
    initControllers(scene, renderer);
    spawnBall(scene);

    renderer.setAnimationLoop(animate);
    window.addEventListener('resize', onWindowResize, false);
}


// ----- Render / Animation Loop -----
function animate() {
    const deltaTime = 1 / 60;
    updatePhysics(deltaTime, scene);
    renderer.render(scene, camera);
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}