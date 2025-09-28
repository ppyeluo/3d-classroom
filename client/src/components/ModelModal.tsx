import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Modal, message } from 'antd';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// 相机控制器组件 - 放在Canvas内部，正确使用useThree
const CameraController = ({ modelGroup, onModelReady }) => {
  const { camera } = useThree(); // 现在在Canvas内部使用useThree
  const controlsRef = useRef<OrbitControls>(null);

  useEffect(() => {
    if (controlsRef.current && modelGroup && camera) {
      // 计算模型包围盒
      const box = new THREE.Box3().setFromObject(modelGroup);
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const distance = maxSize * 2.5;

      // 设置相机位置
      camera.position.set(distance, distance, distance);
      camera.lookAt(box.getCenter(new THREE.Vector3()));
      camera.updateProjectionMatrix();

      // 配置控制器
      controlsRef.current.target.copy(box.getCenter(new THREE.Vector3()));
      controlsRef.current.minDistance = distance * 0.5;
      controlsRef.current.maxDistance = distance * 5;
      controlsRef.current.update();
      
      // 通知模型已准备好
      onModelReady?.();
    }
  }, [modelGroup, camera, onModelReady]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enableZoom={true}
      enablePan={true}
      zoomSpeed={1.2}
      rotateSpeed={0.8}
    />
  );
};

// 模型加载组件
const ModelContent = ({ modelUrl, onModelLoaded }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current && gltf.scene) {
      // 清除模型自身变换
      gltf.scene.position.set(0, 0, 0);
      gltf.scene.rotation.set(0, 0, 0);
      gltf.scene.scale.set(1, 1, 1);

      // 计算包围盒并居中模型
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      groupRef.current.position.set(-center.x, -center.y, -center.z);

      // 统一缩放
      const maxDimension = Math.max(box.getSize(new THREE.Vector3()).x, 
                                   box.getSize(new THREE.Vector3()).y, 
                                   box.getSize(new THREE.Vector3()).z);
      const targetSize = 3;
      const scale = maxDimension > 0 ? targetSize / maxDimension : 1;
      groupRef.current.scale.set(scale, scale, scale);

      // 通知父组件模型已加载
      onModelLoaded?.(groupRef.current);
    }
  }, [gltf, onModelLoaded]);

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} dispose={null} />
      <axesHelper args={[5]} />
    </group>
  );
};

// 加载中占位组件
const LoadingFallback = () => (
  <group>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#E76F00" opacity={0.5} transparent />
    </mesh>
    <Html position={[0, 2, 0]} transform>
      <div>模型加载中...</div>
    </Html>
  </group>
);

// 错误边界组件
class ErrorBoundary extends React.Component {
  state = { hasError: false, errorMsg: '模型加载失败，请关闭后重试' };

  static getDerivedStateFromError(error: Error) {
    const errorMsg = error.message.includes('URL') 
      ? '模型地址错误，请检查URL' 
      : '模型加载失败，可能格式不支持';
    return { hasError: true, errorMsg };
  }

  componentDidCatch(error) {
    console.error('模型加载错误:', error);
    message.error(this.state.errorMsg);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          color: '#f5222d'
        }}>
          {this.state.errorMsg}
        </div>
      );
    }
    return this.props.children;
  }
}

// 主模态框组件 - 移除Canvas外部的useThree使用
const ModelModal = ({ modelUrl, visible, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);

  // 处理模型加载完成
  const handleModelLoaded = (group: THREE.Group) => {
    setModelGroup(group);
    setIsLoading(false);
  };

  useEffect(() => {
    if (visible && modelUrl) {
      setIsLoading(true);
      setModelGroup(null); // 重置模型引用
    } else if (!visible) {
      setIsLoading(false);
      setModelGroup(null);
    }
  }, [visible, modelUrl]);

  return (
    <Modal
      title="3D模型详情"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width="90%"
      height="90vh"
      centered
      destroyOnClose
      maskClosable={false}
      bodyStyle={{ padding: 0, overflow: 'hidden' }}
    >
      <div style={{ width: '100%', height: 'calc(90vh - 70px)',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.1) 50%, rgba(24, 144, 255, 0.05) 100%)',
                backgroundImage: 'linear-gradient(rgba(24, 144, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(24, 144, 255, 0.1) 1px, transparent 1px)',
                backgroundSize:'30px 30px',
                boxShadow:' inset 0 0 150px rgba(24, 144, 255, 0.2)'
      }}>
        <ErrorBoundary>
          <Canvas 
            shadows 
            camera={{ fov: 35, near: 0.1, far: 1000 }} 
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[15, 15, 10]} castShadow intensity={0.6} />
            
            <Suspense fallback={<LoadingFallback />}>
              {modelUrl && (
                <ModelContent 
                  modelUrl={modelUrl} 
                  onModelLoaded={handleModelLoaded} 
                />
              )}
            </Suspense>
            
            {/* 相机控制器现在是Canvas的直接子组件 */}
            <CameraController 
              modelGroup={modelGroup} 
              onModelReady={() => setIsLoading(false)} 
            />
          </Canvas>
        </ErrorBoundary>
      </div>
    </Modal>
  );
};

export default ModelModal;
