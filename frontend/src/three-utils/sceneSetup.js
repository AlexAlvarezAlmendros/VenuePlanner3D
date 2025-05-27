import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

export function createScene() {
  const scene = new THREE.Scene();
  return scene;
}

export function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 20;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    -1000,
    1000
  );
  camera.position.set(10, 10, 10);
  camera.zoom = 1;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  return camera;
}

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

export function createGridHelper() {
  const gridHelper = new THREE.GridHelper(19, 19);
  return gridHelper;
}

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
  outlinePass.edgeStrength = 3;
  outlinePass.edgeGlow = 0.5;
  outlinePass.edgeThickness = 1.0;
  outlinePass.visibleEdgeColor.set('#d62b94');
  outlinePass.hiddenEdgeColor.set('#d62b94');
  composer.addPass(outlinePass);

  return { composer, outlinePass };
}
