import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import Inventory from './components/Inventory';

function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const selectedObjectRef = useRef(null); // Usar useRef para el objeto seleccionado
  const [objects, setObjects] = useState([]);
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const composerRef = useRef();
  const outlinePassRef = useRef();
  const isDragging = useRef(false);
  const isSpacePressed = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

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
    cameraRef.current = camera;
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const gridHelper = new THREE.GridHelper(19, 19);
    scene.add(gridHelper);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 3;
    outlinePass.edgeGlow = 0.5;
    outlinePass.edgeThickness = 1.0;
    outlinePass.visibleEdgeColor.set('#d62b94');
    outlinePass.hiddenEdgeColor.set('#d62b94');
    composer.addPass(outlinePass);
    composerRef.current = composer;
    outlinePassRef.current = outlinePass;

    function animate() {
      requestAnimationFrame(animate);
      composer.render();
    }
    animate();

    return () => {
      renderer.domElement.remove();
    };
  }, []);

  const moveToGrid = (position, gridSize = 0.5, offset = { x: 0, y: 0, z: 0 }) => {
    return {
      x: Math.round((position.x - offset.x) / gridSize) * gridSize + offset.x,
      y: Math.round((position.y - offset.y) / gridSize) * gridSize + offset.y,
      z: Math.round((position.z - offset.z) / gridSize) * gridSize + offset.z,
    };
  };

  const addObjectToScene = (type, position) => {
    const scene = sceneRef.current;
    let geometry;
    let offset = { x: 0, y: 0, z: 0 };
    let material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    switch (type) {
      case 'truss':
        geometry = new THREE.BoxGeometry(1, 1, 4);
        offset = { x: 0.5, y: 0.5, z: 2 };
        material = new THREE.MeshBasicMaterial({ color: 0xe08626 });
        break;
      case 'light':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        offset = { x: 0.5, y: 0.5, z: 2 };
        material = new THREE.MeshBasicMaterial({ color: 0x2b75d6 });
        break;
      case 'speaker':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
        offset = { x: 0.5, y: 0.5, z: 1 };
        material = new THREE.MeshBasicMaterial({ color: 0xd62b94 });
        break;
      default:
        return;
    }

    const newObject = new THREE.Mesh(geometry, material);
    newObject.position.set(position.x, position.y, position.z);
    scene.add(newObject);

    setObjects((prevObjects) => [...prevObjects, newObject]);
    newObject.userData.isSelectable = true;

    const dragControls = new DragControls([newObject], cameraRef.current, rendererRef.current.domElement);
    dragControls.addEventListener('dragstart', function (event) {
      event.object.material.opacity = 0.5;
      selectedObjectRef.current = event.object; // Asegura que el objeto seleccionado sea el que se está arrastrando
      outlinePassRef.current.selectedObjects = [event.object]; // Aplicar contorno solo al objeto arrastrado
    });
    dragControls.addEventListener('dragend', function (event) {
      event.object.material.opacity = 1.0;
      const newPosition = moveToGrid(event.object.position);
      event.object.position.set(newPosition.x, newPosition.y, newPosition.z);
    });
  };

  const handleSelect = (itemType) => {
    setSelectedItem(itemType);
    const defaultPosition = moveToGrid({ x: 1, y: 1, z: 0.5 });
    addObjectToScene(itemType, defaultPosition);
  };

  const handleMouseClick = (event) => {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
  
    // Obtener las intersecciones ordenadas por distancia (normalmente ya están ordenadas)
    const intersects = raycaster.intersectObjects(objects, true);  // true asegura que también se consideren los hijos de objetos
  
    if (intersects.length > 0) {
      // El primer objeto es el más cercano a la cámara
      const closestObject = intersects[0].object;
  
      // Solo actualizar si el objeto seleccionado es diferente
      if (selectedObjectRef.current !== closestObject) {
        if (selectedObjectRef.current) {
          outlinePassRef.current.selectedObjects = [];
        }
  
        selectedObjectRef.current = closestObject;
        outlinePassRef.current.selectedObjects = [closestObject];
  
        console.log("Selected Object:", closestObject);
      }
    }
  };
  
  

  const handleMouseDown = (event) => {
    if (isSpacePressed.current && !selectedObjectRef.current) {
      isDragging.current = true;
      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };

      selectedObjectRef.current = null;
      outlinePassRef.current.selectedObjects = [];
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging.current && isSpacePressed.current) {
      const deltaX = event.clientX - previousMousePosition.current.x;
      const deltaY = event.clientY - previousMousePosition.current.y;

      const rotationSpeed = 0.005;
      const camera = cameraRef.current;

      camera.position.x = camera.position.x * Math.cos(deltaX * rotationSpeed) + camera.position.z * Math.sin(deltaX * rotationSpeed);
      camera.position.z = camera.position.z * Math.cos(deltaX * rotationSpeed) - camera.position.x * Math.sin(deltaX * rotationSpeed);
      camera.position.y += deltaY * rotationSpeed;
      camera.lookAt(0, 0, 0);

      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleKeyDown = (event) => {
    if (event.code === 'Space') {
      isSpacePressed.current = true;
    }
  
    const selectedObject = selectedObjectRef.current;
  
    if (!selectedObject) {
      console.log("No object selected");
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
      const newPosition = moveToGrid(selectedObject.position, 0.5);
      selectedObject.position.set(newPosition.x, newPosition.y, newPosition.z);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  };

  const handleMouseWheel = (event) => {
    const selectedObject = selectedObjectRef.current;
  
    if (!selectedObject) return;
  
    // Definir la rotación en incrementos de 45 grados (π/4 radianes)
    const rotationIncrement = Math.PI / 4;
  
    // Obtener la dirección de la rueda del mouse (positivo o negativo)
    const direction = event.deltaY > 0 ? 1 : -1;
  
    // Calcular la nueva rotación ajustada a 45 grados
    const newRotation = selectedObject.rotation.y + direction * rotationIncrement;
  
    // Redondear la rotación al múltiplo más cercano de 45 grados
    selectedObject.rotation.y = Math.round(newRotation / rotationIncrement) * rotationIncrement;
  
    // Forzar la actualización de la escena
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };
  

  const handleKeyUp = (event) => {
    if (event.code === 'Space') {
      isSpacePressed.current = false;
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleMouseClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleMouseWheel);

    return () => {
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleMouseWheel);
    };
  }, [objects]);

  return (
    <div className="App">
      <h1>Venue Planner 3D</h1>
        <Inventory onSelect={handleSelect} />
      <div id="canvas-container" />
    </div>
  );
}

export default App;
