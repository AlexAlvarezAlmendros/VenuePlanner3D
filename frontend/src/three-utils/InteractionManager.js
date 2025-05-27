import * as THREE from 'three';
// Removed unused DragControls import
import { moveToGrid } from './objectFactory.js';

export function initObjectSelection(camera, outlinePass, selectedObjectRef_callback, getObjects_callback) {
  const onMouseClick = (event) => {
    if (!camera || !getObjects_callback || !outlinePass || !selectedObjectRef_callback) return;

    const objects = getObjects_callback();
    if (objects.length === 0) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      const closestObject = intersects[0].object;
      // The callback will check if it's different from the current selected object
      selectedObjectRef_callback(closestObject); 
      outlinePass.selectedObjects = [closestObject];
      console.log("Selected Object (from InteractionManager):", closestObject);
    } else {
      selectedObjectRef_callback(null); // Deselect if clicked on empty space
      outlinePass.selectedObjects = [];
    }
  };

  window.addEventListener('click', onMouseClick);
  return () => {
    window.removeEventListener('click', onMouseClick);
  };
}

export function initKeyboardControls(selectedObjectRef_getter, composer, scene, camera, getMoveToGridFn) {
  const onKeyDown = (event) => {
    const selectedObject = selectedObjectRef_getter();
    const currentMoveToGrid = getMoveToGridFn();

    // Note: 'scene' and 'camera' parameters are not strictly necessary if composer.render() doesn't require them,
    // but keeping them for now as they might be useful for other operations or if rendering changes.
    if (!selectedObject || !currentMoveToGrid || !composer || !scene || !camera) {
      // console.log("No object selected or missing refs for keyboard controls");
      return;
    }

    let moved = false;
    switch (event.key) {
      case 'ArrowUp':
        selectedObject.position.z -= 0.5;
        moved = true;
        break;
      case 'ArrowDown':
        selectedObject.position.z += 0.5;
        moved = true;
        break;
      case 'ArrowLeft':
        selectedObject.position.x -= 0.5;
        moved = true;
        break;
      case 'ArrowRight':
        selectedObject.position.x += 0.5;
        moved = true;
        break;
      default:
        return;
    }

    if (moved) {
      const newPosition = currentMoveToGrid(selectedObject.position);
      selectedObject.position.set(newPosition.x, newPosition.y, newPosition.z);
      if (composer) { // Check if composer exists
         composer.render(); // EffectComposer.render() usually doesn't take scene and camera as args
      }
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
  };
}

export function initMouseWheelControls(selectedObjectRef_getter, composer, scene, camera) {
  const onMouseWheel = (event) => {
    const selectedObject = selectedObjectRef_getter();
     // Note: 'scene' and 'camera' parameters for similar reasons as above.
    if (!selectedObject || !composer || !scene || !camera) return;

    const rotationIncrement = Math.PI / 4;
    const direction = event.deltaY > 0 ? 1 : -1;
    const newRotation = selectedObject.rotation.y + direction * rotationIncrement;
    selectedObject.rotation.y = Math.round(newRotation / rotationIncrement) * rotationIncrement;

    if (composer) { // Check if composer exists
        composer.render(); // EffectComposer.render()
    }
  };

  window.addEventListener('wheel', onMouseWheel);
  return () => {
    window.removeEventListener('wheel', onMouseWheel);
  };
}

export function initCameraPanning(cameraRef, isSpacePressedRef, selectedObjectRef_getter, outlinePassRef) {
  const isDragging = { current: false }; // Local ref-like object for dragging state
  const previousMousePosition = { current: { x: 0, y: 0 } }; // Local ref-like object

  const onMouseDown = (event) => {
    // Check selectedObjectRef_getter() to ensure no object is selected when starting camera pan
    if (isSpacePressedRef.current && !selectedObjectRef_getter()) {
      isDragging.current = true;
      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
      if (outlinePassRef.current) { // Deselect object if space is pressed for camera movement
         outlinePassRef.current.selectedObjects = [];
      }
      // selectedObjectRef_callback(null); // This should be handled by App.js's selectedObjectRef_callback passed to initObjectSelection
    }
  };

  const onMouseMove = (event) => {
    if (isDragging.current && isSpacePressedRef.current && cameraRef.current) {
      const deltaX = event.clientX - previousMousePosition.current.x;
      const deltaY = event.clientY - previousMousePosition.current.y;
      const rotationSpeed = 0.005;
      const camera = cameraRef.current;
      const pivot = new THREE.Vector3(0, 0, 0);
      const oldPos = camera.position.clone();

      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * rotationSpeed);
      
      const localX = new THREE.Vector3().crossVectors(camera.up, camera.position.clone().sub(pivot).normalize());
      camera.position.applyAxisAngle(localX, deltaY * rotationSpeed);
      
      camera.lookAt(pivot);
      
      if (camera.position.distanceTo(pivot) < 1 || oldPos.y * camera.position.y < -0.1) {
          camera.position.copy(oldPos);
          camera.lookAt(pivot);
      }

      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}

export function initSpacebarControls(isSpacePressedRef) {
  const onKeyUp = (event) => {
    if (event.code === 'Space') {
      isSpacePressedRef.current = false;
    }
  };
  const onKeyDown = (event) => { // Also need to set true on keydown
    if (event.code === 'Space') {
      isSpacePressedRef.current = true;
    }
  };


  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('keydown', onKeyDown); // Add keydown listener for setting true

  return () => {
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('keydown', onKeyDown); // Remove keydown listener
  };
}
