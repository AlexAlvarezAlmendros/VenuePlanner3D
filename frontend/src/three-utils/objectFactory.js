import * as THREE from 'three';

export function moveToGrid(position, gridSize = 0.5, offset = { x: 0, y: 0, z: 0 }) {
  return {
    x: Math.round((position.x - offset.x) / gridSize) * gridSize + offset.x,
    y: Math.round((position.y - offset.y) / gridSize) * gridSize + offset.y,
    z: Math.round((position.z - offset.z) / gridSize) * gridSize + offset.z,
  };
}

export function createObject(type, initialPosition) {
  let geometry;
  // let offset = { x: 0, y: 0, z: 0 }; // Offset is applied by moveToGrid before calling this
  let material;

  switch (type) {
    case 'truss':
      geometry = new THREE.BoxGeometry(1, 1, 4);
      // offset = { x: 0.5, y: 0.5, z: 2 }; // Original offset, handled by moveToGrid in App.js
      material = new THREE.MeshBasicMaterial({ color: 0xe08626 });
      break;
    case 'light':
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      // offset = { x: 0.5, y: 0.5, z: 2 }; // Original offset
      material = new THREE.MeshBasicMaterial({ color: 0x2b75d6 });
      break;
    case 'speaker':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
      // offset = { x: 0.5, y: 0.5, z: 1 }; // Original offset
      material = new THREE.MeshBasicMaterial({ color: 0xd62b94 });
      break;
    default:
      console.warn(`Unknown object type: ${type}`);
      return null; // Or throw an error
  }

  const newObject = new THREE.Mesh(geometry, material);
  newObject.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
  newObject.userData.isSelectable = true;

  return newObject;
}
