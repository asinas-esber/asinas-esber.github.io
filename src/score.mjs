import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let font;
let scoreText;
let score = 0;

export function initScoreDisplay(scene) {
  const loader = new FontLoader();
  loader.load('fonts/helvetiker_regular.typeface.json', function (loadedFont) {
    font = loadedFont;
    
    const geometry = new TextGeometry('Score: 0', {
      font: font,
      size: 0.2,
      height: 0.02,
    });
    
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.8
    });
    
    scoreText = new THREE.Mesh(geometry, material);
    scoreText.position.set(-1, 2, -3);
    scoreText.rotation.y = 0;
    
    scene.add(scoreText);
  });
}

export function updateScore(scene) {
  if (!font || !scoreText) return;

  score++;
  scene.remove(scoreText);
  
  const geometry = new TextGeometry(`Score: ${score + 1}`, {
    font: font,
    size: 0.2,
    height: 0.02,
  });
  
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.8
  });
  
  scoreText = new THREE.Mesh(geometry, material);
  scoreText.position.set(-1, 2, -3);
  scoreText.rotation.y = 0;
  
  scene.add(scoreText);
}