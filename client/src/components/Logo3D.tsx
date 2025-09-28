// src/components/Logo3D.tsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface Logo3DProps {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}

const Logo3D: React.FC<Logo3DProps> = ({ 
  position = [0, 0, 0], 
  scale = 1, // 默认缩放调整为1，由容器控制大小
  rotation = [0, 0, 0]
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const logoRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>();
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // 调整相机和渲染器尺寸的函数
  const updateSize = () => {
    const container = mountRef.current;
    if (!container || !rendererRef.current || !cameraRef.current) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // 更新渲染器尺寸
    rendererRef.current.setSize(width, height);
    
    // 更新相机比例和投影矩阵
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
  };

  // 调整相机位置以适应模型
  const fitCameraToModel = () => {
    if (!logoRef.current || !cameraRef.current || !sceneRef.current) return;
    
    const box = new THREE.Box3().setFromObject(logoRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * cameraRef.current.fov / 360));
    const fitWidthDistance = fitHeightDistance / cameraRef.current.aspect;
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);
    
    const direction = cameraRef.current.position.clone()
      .sub(center)
      .normalize()
      .multiplyScalar(distance);
    
    cameraRef.current.position.copy(center).add(direction);
    cameraRef.current.near = distance / 100;
    cameraRef.current.far = distance * 100;
    cameraRef.current.updateProjectionMatrix();
    cameraRef.current.lookAt(center);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 初始化场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;

    // 相机 - 使用更大的视野角度
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // 渲染器 - 初始尺寸设为容器大小
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 初始设置尺寸
    updateSize();
    container.appendChild(renderer.domElement);

    // 增强光照系统
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);

    // 加载GLB模型
    const loader = new GLTFLoader();
    
    loader.load(
      '/models/logo.glb',
      (gltf) => {
        const logo = gltf.scene;
        logoRef.current = logo;
        
        // 设置位置、缩放、旋转
        logo.position.set(...position);
        logo.scale.setScalar(scale);
        logo.rotation.set(...rotation);
        
        // 优化材质效果
        logo.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.metalness = 0.3;
              child.material.roughness = 0.2;
              child.material.envMapIntensity = 1.5;
            } else if (child.material instanceof THREE.MeshBasicMaterial) {
              child.material.color.multiplyScalar(1.2);
            }
          }
        });

        scene.add(logo);
        
        // 模型加载后调整相机使其填满视图
        fitCameraToModel();
      },
      (progress) => {
        console.log(`Logo加载进度: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
      },
      (error) => {
        console.error('加载Logo模型失败:', error);
        // 加载失败时显示备用文本
        const errorText = document.createElement('div');
        errorText.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #1890ff;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        errorText.textContent = '立体课堂';
        container.appendChild(errorText);
      }
    );

    // 动画循环
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    // 响应式调整
    const handleResize = () => {
      updateSize();
      fitCameraToModel(); // 窗口大小变化时重新调整相机
    };

    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 拖拽旋转交互
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = {
        x: e.clientX,
        y: e.clientY
      };
      container.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !logoRef.current) return;
      
      const deltaMove = {
        x: e.clientX - previousMousePositionRef.current.x,
        y: e.clientY - previousMousePositionRef.current.y
      };
      
      logoRef.current.rotation.y += deltaMove.x * 0.01;
      logoRef.current.rotation.x += deltaMove.y * 0.01;
      
      previousMousePositionRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = 'grab';
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 清理函数
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousedown', handleMouseDown);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (container && rendererRef.current?.domElement) {
        container.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [position, scale, rotation]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        cursor: 'grab',
        minHeight: '200px', // 确保有最小高度
      }}
    />
  );
};

export default Logo3D;