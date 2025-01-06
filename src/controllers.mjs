import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { onSelectStart, onSelectEnd } from './ball.mjs';

export let controller1, controller2;
export let controllerGrip1, controllerGrip2;

export const controllerData = {
  left: { positionHistory: [], velocity: new THREE.Vector3(), isHolding: false },
  right: { positionHistory: [], velocity: new THREE.Vector3(), isHolding: false }
};



// ----- Controllers -----
export function initControllers(scene, renderer) {
    const controllerModelFactory = new XRControllerModelFactory();
  
    controller1 = renderer.xr.getController(0);
    controller1.userData = { isHolding: false, heldBall: null };
    scene.add(controller1);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', (event) => onSelectEnd(event, scene));

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
  
    controller2 = renderer.xr.getController(1);
    controller2.userData = { isHolding: false, heldBall: null };
    scene.add(controller2);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', (event) => onSelectEnd(event, scene));
  
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
  }