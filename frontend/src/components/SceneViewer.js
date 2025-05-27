import React, { useEffect, useRef } from 'react';
import {
  createScene,
  createCamera,
  createRenderer,
  createGridHelper,
  createComposer,
} from '../../three-utils/sceneSetup'; // Adjusted path

function SceneViewer(props) {
  const mountRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    // Assign THREE.js objects to refs passed from App.js
    props.sceneRef.current = createScene();
    props.cameraRef.current = createCamera();
    props.rendererRef.current = createRenderer();

    const { composer, outlinePass } = createComposer(
      props.rendererRef.current,
      props.sceneRef.current,
      props.cameraRef.current
    );
    props.composerRef.current = composer;
    props.outlinePassRef.current = outlinePass;

    const gridHelper = createGridHelper();
    props.sceneRef.current.add(gridHelper);

    // Append renderer to the mount point
    mountRef.current.appendChild(props.rendererRef.current.domElement);

    // Animation loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (props.composerRef.current) {
        props.composerRef.current.render();
      }
    };
    animate();

    // Cleanup
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (props.rendererRef.current && props.rendererRef.current.domElement && mountRef.current) {
        mountRef.current.removeChild(props.rendererRef.current.domElement);
      }
      // Optional: Dispose of THREE.js objects if App.js is also unmounting
      // props.rendererRef.current.dispose();
      // props.sceneRef.current.dispose(); // etc.
    };
  }, [props.sceneRef, props.cameraRef, props.rendererRef, props.composerRef, props.outlinePassRef]); // Include all prop refs in dependency array

  return <div ref={mountRef} id="canvas-container-viewer" />; // Changed id to avoid conflict if any
}

export default SceneViewer;
