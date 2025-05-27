import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three'; // Still needed for THREE.Raycaster, THREE.Vector2 (implicitly used by Raycaster & DragControls)
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import Inventory from './components/Inventory';
import SceneViewer from './components/SceneViewer';
import { createObject, moveToGrid } from '../three-utils/objectFactory';
import {
  initObjectSelection,
  initKeyboardControls,
  initMouseWheelControls,
  initCameraPanning,
  initSpacebarControls,
} from '../three-utils/InteractionManager';

function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const selectedObjectRef = useRef(null);
  const [objects, setObjects] = useState([]);
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const composerRef = useRef(); // Used by SceneViewer, passed to InteractionManager for context
  const outlinePassRef = useRef(); // Used by SceneViewer, passed to InteractionManager
  // isDragging and previousMousePosition are removed, now internal to initCameraPanning
  const isSpacePressed = useRef(false); // Still needed for InteractionManager

  // addObjectToScene remains in App.js as it's tied to object creation and DragControls setup per object
  const addObjectToScene = (type, position) => {
    const newObject = createObject(type, position);
    if (!newObject) return;

    if (sceneRef.current) {
        sceneRef.current.add(newObject);
    }
    setObjects((prevObjects) => [...prevObjects, newObject]);

    // DragControls are specific to each object and depend on refs available in App.js
    if (cameraRef.current && rendererRef.current && rendererRef.current.domElement) {
        const dragControls = new DragControls([newObject], cameraRef.current, rendererRef.current.domElement);
        dragControls.addEventListener('dragstart', function (event) {
            event.object.material.opacity = 0.5;
            selectedObjectRef.current = event.object; // Update App's selectedObjectRef
            if (outlinePassRef.current) {
                outlinePassRef.current.selectedObjects = [event.object];
            }
        });
        dragControls.addEventListener('dragend', function (event) {
            event.object.material.opacity = 1.0;
            const newPosition = moveToGrid(event.object.position);
            event.object.position.set(newPosition.x, newPosition.y, newPosition.z);
            // No need to deselect here, selection is handled by initObjectSelection
        });
    }
  };

  const handleSelect = (itemType) => {
    setSelectedItem(itemType);
    let offset = { x: 0, y: 0, z: 0 };
    switch (itemType) {
      case 'truss': offset = { x: 0.5, y: 0.5, z: 2 }; break;
      case 'light': offset = { x: 0.5, y: 0.5, z: 0.5 }; break;
      case 'speaker': offset = { x: 0.5, y: 0.5, z: 1 }; break;
      default: break;
    }
    const defaultInitialPosition = { x: 1, y: 0, z: 0.5 };
    const gridAlignedPosition = moveToGrid(defaultInitialPosition, 0.5, offset);
    addObjectToScene(itemType, gridAlignedPosition);
  };

  // All handle... functions (handleMouseClick, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleMouseWheel, handleKeyUp)
  // are removed from here and their logic is now in InteractionManager.js

  useEffect(() => {
    // Ensure all refs are initialized before setting up interactions
    if (cameraRef.current && outlinePassRef.current && rendererRef.current && sceneRef.current && composerRef.current) {
      const selectedObjectRef_callback = (object) => {
        if (selectedObjectRef.current !== object) { // Only update if the object actually changed
          selectedObjectRef.current = object;
          // The outlinePass.selectedObjects is handled by initObjectSelection directly
        }
      };

      const getObjects_callback = () => objects;
      const selectedObjectRef_getter = () => selectedObjectRef.current;
      const getMoveToGridFn = () => moveToGrid; // Pass the function itself

      // Initialize interactions from InteractionManager
      const cleanupObjectSelection = initObjectSelection(cameraRef.current, outlinePassRef.current, selectedObjectRef_callback, getObjects_callback);
      // Note: For initKeyboardControls and initMouseWheelControls, composerRef.current.render() might be better if available
      const cleanupKeyboardControls = initKeyboardControls(selectedObjectRef_getter, composerRef.current, sceneRef.current, cameraRef.current, getMoveToGridFn);
      const cleanupMouseWheelControls = initMouseWheelControls(selectedObjectRef_getter, composerRef.current, sceneRef.current, cameraRef.current);
      const cleanupCameraPanning = initCameraPanning(cameraRef, isSpacePressed, selectedObjectRef_getter, outlinePassRef);
      const cleanupSpacebarControls = initSpacebarControls(isSpacePressed);

      // Return a cleanup function that calls all individual cleanup functions
      return () => {
        cleanupObjectSelection();
        cleanupKeyboardControls();
        cleanupMouseWheelControls();
        cleanupCameraPanning();
        cleanupSpacebarControls();
      };
    }
    // Dependencies: all refs and 'objects' array for getObjects_callback
  }, [objects, cameraRef, sceneRef, rendererRef, composerRef, outlinePassRef, isSpacePressed]);


  return (
    <div className="App">
      <h1>Venue Planner 3D</h1>
      <Inventory onSelect={handleSelect} />
      <SceneViewer
        sceneRef={sceneRef}
        cameraRef={cameraRef}
        rendererRef={rendererRef}
        composerRef={composerRef}
        outlinePassRef={outlinePassRef}
      />
    </div>
  );
}

export default App;
