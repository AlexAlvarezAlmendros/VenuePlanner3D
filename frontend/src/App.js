import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import Inventory from './components/Inventory';

function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objects, setObjects] = useState([]); // Definición de objects y setObjects
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const composerRef = useRef();
  const outlinePassRef = useRef();
  const isDragging = useRef(false);
  const isSpacePressed = useRef(false); // Cambiar a useRef para evitar re-renderizados
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Crear la escena una sola vez
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

    // Posicionar la cámara para una vista isométrica
    camera.position.set(10, 10, 10); // Mover la cámara en los tres ejes
    camera.zoom = 1; // Puedes ajustar el zoom para acercar/alejar
    camera.lookAt(0, 0, 0); // Hacer que la cámara mire al origen
    cameraRef.current = camera;
    camera.updateProjectionMatrix();

    // Crear el renderizador una sola vez
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Añadir la rejilla a la escena
    const gridHelper = new THREE.GridHelper(19, 19);
    scene.add(gridHelper);

    // Post-processing para resaltar objetos seleccionados
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 3; // Intensidad del contorno
    outlinePass.edgeGlow = 0.5; // Resplandor del contorno
    outlinePass.edgeThickness = 1.0; // Grosor del contorno
    outlinePass.visibleEdgeColor.set('#d62b94'); // Color del contorno
    outlinePass.hiddenEdgeColor.set('#d62b94'); // Color del contorno en los bordes ocultos
    composer.addPass(outlinePass);
    composerRef.current = composer;
    outlinePassRef.current = outlinePass;

    // Iniciar la animación
    function animate() {
      requestAnimationFrame(animate);
      composer.render();
    }
    animate();

    // Cleanup en desmontaje
    return () => {
      renderer.domElement.remove(); // Elimina el canvas al desmontar el componente
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
        offset = { x: 0.5, y: 0.5, z: 2 }; // Centrar el truss en la rejilla
        material = new THREE.MeshBasicMaterial({ color: 0xe08626 });
        break;
      case 'light':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        offset = { x: 0.5, y: 0.5, z: 2 }; // Centrar la luz en la rejilla
        material = new THREE.MeshBasicMaterial({ color: 0x2b75d6 });
        break;
      case 'speaker':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
        offset = { x: 0.5, y: 0.5, z: 1 }; // Centrar el altavoz en la rejilla
        material = new THREE.MeshBasicMaterial({ color: 0xd62b94 });
        break;
      default:
        return;
    }

    const newObject = new THREE.Mesh(geometry, material);
    newObject.position.set(position.x, position.y, position.z);
    scene.add(newObject);

    setObjects((prevObjects) => [...prevObjects, newObject]); // Actualizar el estado correctamente

    // Hacer que el objeto sea seleccionable
    newObject.userData.isSelectable = true;
    // Configurar DragControls
    const dragControls = new DragControls([newObject], cameraRef.current, rendererRef.current.domElement);
    dragControls.addEventListener('dragstart', function (event) {
      event.object.material.opacity = 0.5;
    });
    dragControls.addEventListener('dragend', function (event) {
      event.object.material.opacity = 1.0;
      const newPosition = moveToGrid(event.object.position);
      event.object.position.set(newPosition.x, newPosition.y, newPosition.z);
    });
  };

  const handleSelect = (itemType) => {
    setSelectedItem(itemType);

    // Añadir el objeto seleccionado a la escena en una posición predeterminada
    const defaultPosition = moveToGrid({ x: 1, y: 1, z: 0.5 });
    addObjectToScene(itemType, defaultPosition);
  };

  const handleMouseClick = (event) => {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      // Si hay un objeto previamente seleccionado, quita su contorno
      if (selectedObject) {
        outlinePassRef.current.selectedObjects = [];
      }

      // Selecciona el nuevo objeto y añade el contorno
      setSelectedObject(object);
      outlinePassRef.current.selectedObjects = [object];

      console.log("Selected Object:", object);
    }
  };

  const handleMouseDown = (event) => {
    if (isSpacePressed.current && !selectedObject) {
      isDragging.current = true;
      previousMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };

      // Deseleccionar todos los objetos
      setSelectedObject(null);
      outlinePassRef.current.selectedObjects = [];
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging.current && isSpacePressed.current) {
      const deltaX = event.clientX - previousMousePosition.current.x;
      const deltaY = event.clientY - previousMousePosition.current.y;

      const rotationSpeed = 0.005;
      const camera = cameraRef.current;

      // Rotar la cámara alrededor del origen
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
  
    if (!selectedObject) {
      console.log("No object selected");
      return;
    }
  
    console.log("Selected Object:", selectedObject); // Verificar que el objeto esté correctamente seleccionado
  
    let moved = false;
  
    switch (event.key) {
      case 'ArrowUp':
        selectedObject.position.z -= 0.5;
        console.log("ArrowUp", selectedObject.position);
        moved = true;
        break;
      case 'ArrowDown':
        selectedObject.position.z += 0.5;
        console.log("ArrowDown", selectedObject.position);
        moved = true;
        break;
      case 'ArrowLeft':
        selectedObject.position.x -= 0.5;
        console.log("ArrowLeft", selectedObject.position);
        moved = true;
        break;
      case 'ArrowRight':
        selectedObject.position.x += 0.5;
        console.log("ArrowRight", selectedObject.position);
        moved = true;
        break;
      default:
        return;
    }
  
    if (moved) {
      const newPosition = moveToGrid(selectedObject.position, 0.5);
      selectedObject.position.set(newPosition.x, newPosition.y, newPosition.z);
  
      // Forzar la actualización de la escena si es necesario
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  };
  
  const handleMouseWheel = (event) => {
    if (!selectedObject) return;
    console.log("mousewheel");
    // Controlar la velocidad de rotación
    const rotationSpeed = 0.05;

    // Rotar en el eje Y al girar la rueda del mouse
    selectedObject.rotation.y += event.deltaY * rotationSpeed;

    // Forzar la actualización de la escena si es necesario
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
    window.addEventListener('wheel', handleMouseWheel); // Agregar evento para la rueda del mouse

    return () => {
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleMouseWheel); // Remover evento para la rueda del mouse
    };
  }, [objects]);

  return (
    <div className="App">
      <h1>3D Event Design Tool</h1>
      <div className="inventory">
        <Inventory onSelect={handleSelect} />
      </div>
      <div id="canvas-container" />
    </div>
  );
}

export default App;
