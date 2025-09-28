// src/components/ThreeDBackground.tsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 定义OrbitControls的类型
class OrbitControls {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  enabled: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  rotateSpeed: number;
  spherical: { radius: number; phi: number; theta: number };
  target: THREE.Vector3;
  rotateStart: THREE.Vector2;
  isRotating: boolean;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    this.rotateSpeed = 1.0;
    
    this.spherical = { radius: 25, phi: Math.PI / 3, theta: 0 };
    this.target = new THREE.Vector3();
    this.rotateStart = new THREE.Vector2();
    this.isRotating = false;
    
    this.bindEvents();
    this.update();
  }
  
  bindEvents() {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  onMouseDown(event: MouseEvent) {
    if (!this.enabled) return;
    this.rotateStart.set(event.clientX, event.clientY);
    this.isRotating = true;
    this.domElement.style.cursor = 'grabbing';
  }
  
  onMouseMove(event: MouseEvent) {
    if (!this.enabled || !this.isRotating) return;
    
    const rotateEnd = new THREE.Vector2(event.clientX, event.clientY);
    const rotateDelta = new THREE.Vector2().subVectors(rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed * 0.01);
    
    this.spherical.theta -= rotateDelta.x;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - rotateDelta.y));
    
    this.rotateStart.copy(rotateEnd);
    this.update();
  }
  
  onMouseUp() {
    this.isRotating = false;
    this.domElement.style.cursor = 'grab';
  }
  
  onWheel(event: WheelEvent) {
    if (!this.enabled) return;
    event.preventDefault();
    this.spherical.radius *= event.deltaY > 0 ? 1.05 : 0.95;
    this.spherical.radius = Math.max(10, Math.min(60, this.spherical.radius));
    this.update();
  }
  
  update() {
    const sinPhi = Math.sin(this.spherical.phi);
    this.camera.position.x = this.spherical.radius * sinPhi * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.spherical.radius * sinPhi * Math.cos(this.spherical.theta);
    this.camera.lookAt(this.target);
  }
}

// 定义模型用户数据类型
interface ModelUserData {
  originalPosition: THREE.Vector3;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  floatHeight: number;
  floatSpeed: number;
  angle: number;
}

interface BlossomUserData {
  speed: number;
  rotationSpeed: number;
  amplitude: number;
  timeOffset: number;
}

const ThreeDBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 化学键创建函数
    const createBond = (start: THREE.Vector3, end: THREE.Vector3, color: number = 0xcccccc): THREE.Mesh => {
      const length = start.distanceTo(end);
      const bond = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, length, 8),
        new THREE.MeshPhongMaterial({ color })
      );
      
      bond.position.copy(start).lerp(end, 0.5);
      bond.lookAt(end);
      bond.rotateX(Math.PI / 2);
      
      return bond;
    };

    // 模型创建函数
    const createCherryBlossom = (): THREE.Group => {
      const group = new THREE.Group();
      
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 6, 4),
          new THREE.MeshPhongMaterial({ 
            color: 0xffb6c1,
            transparent: true,
            opacity: 0.9
          })
        );
        petal.position.x = Math.cos(angle) * 0.4;
        petal.position.z = Math.sin(angle) * 0.4;
        petal.scale.set(1, 0.3, 1);
        group.add(petal);
      }
      
      const stamen = new THREE.Mesh(
        new THREE.SphereGeometry(0.08),
        new THREE.MeshPhongMaterial({ color: 0xffd700 })
      );
      group.add(stamen);
      
      return group;
    };

    const createMathModels = (): THREE.Group => {
      const group = new THREE.Group();
      
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshPhongMaterial({ 
          color: 0x4ecdc4,
          transparent: true,
          opacity: 0.9
        })
      );
      cube.position.set(-2.5, 0, 0);
      group.add(cube);
      
      const pyramid = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.8, 4),
        new THREE.MeshPhongMaterial({ color: 0x45b7d1 })
      );
      pyramid.position.set(0, 0, 0);
      group.add(pyramid);
      
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 16, 12),
        new THREE.MeshPhongMaterial({ 
          color: 0x96ceb4,
          wireframe: true
        })
      );
      sphere.position.set(2.5, 0, 0);
      group.add(sphere);
      
      return group;
    };

    const createEnglishLetters = (): THREE.Group => {
      const group = new THREE.Group();
      
      const createLetter = (letter: string, color: number, position: THREE.Vector3): THREE.Mesh => {
        let geometry: THREE.BufferGeometry;
        switch(letter) {
          case 'A':
            geometry = new THREE.ConeGeometry(0.6, 1.5, 3);
            break;
          case 'B':
            geometry = new THREE.SphereGeometry(0.7, 8, 6);
            break;
          case 'C':
            geometry = new THREE.TorusGeometry(0.8, 0.2, 8, 16, Math.PI);
            break;
          default:
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }
        
        const material = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        return mesh;
      };
      
      group.add(createLetter('A', 0xffa726, new THREE.Vector3(-2, 0, 0)));
      group.add(createLetter('B', 0xff6b6b, new THREE.Vector3(0, 0, 0)));
      group.add(createLetter('C', 0x4ecdc4, new THREE.Vector3(2, 0, 0)));
      
      return group;
    };

    const createLever = (): THREE.Group => {
      const group = new THREE.Group();
      
      const fulcrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 0.4),
        new THREE.MeshPhongMaterial({ color: 0x8B4513 })
      );
      fulcrum.position.y = -0.2;
      group.add(fulcrum);
      
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.1, 0.3),
        new THREE.MeshPhongMaterial({ color: 0xcccccc })
      );
      beam.position.y = 0;
      group.add(beam);
      
      const weight1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.8, 0.5),
        new THREE.MeshPhongMaterial({ color: 0xff4444 })
      );
      weight1.position.set(-1.5, -0.5, 0);
      group.add(weight1);
      
      const weight2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.4),
        new THREE.MeshPhongMaterial({ color: 0x4444ff })
      );
      weight2.position.set(1.5, -0.3, 0);
      group.add(weight2);
      
      return group;
    };

    const createMolecules = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 甲烷分子
      const methane = new THREE.Group();
      const carbon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3),
        new THREE.MeshPhongMaterial({ color: 0x333333 })
      );
      methane.add(carbon);
      
      const vertices = [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0.94, -0.33, 0),
        new THREE.Vector3(-0.47, -0.33, 0.82),
        new THREE.Vector3(-0.47, -0.33, -0.82)
      ];
      
      vertices.forEach(vertex => {
        const hydrogen = new THREE.Mesh(
          new THREE.SphereGeometry(0.2),
          new THREE.MeshPhongMaterial({ color: 0xffffff })
        );
        hydrogen.position.copy(vertex.multiplyScalar(1.2));
        methane.add(hydrogen);
        
        const bond = createBond(new THREE.Vector3(0, 0, 0), hydrogen.position, 0xaaaaaa);
        methane.add(bond);
      });
      methane.position.set(-3, 0, 0);
      group.add(methane);
      
      // 水分子
      const water = new THREE.Group();
      const oxygen = new THREE.Mesh(
        new THREE.SphereGeometry(0.28),
        new THREE.MeshPhongMaterial({ color: 0xff4444 })
      );
      water.add(oxygen);
      
      const h1Pos = new THREE.Vector3(0.8, 0.3, 0);
      const h2Pos = new THREE.Vector3(-0.8, 0.3, 0);
      
      const hydrogen1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
      );
      hydrogen1.position.copy(h1Pos);
      water.add(hydrogen1);
      
      const hydrogen2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
      );
      hydrogen2.position.copy(h2Pos);
      water.add(hydrogen2);
      
      water.add(createBond(new THREE.Vector3(0, 0, 0), h1Pos));
      water.add(createBond(new THREE.Vector3(0, 0, 0), h2Pos));
      
      water.position.set(3, 0, 0);
      group.add(water);
      
      return group;
    };

    const createCell = (): THREE.Group => {
      const group = new THREE.Group();
      
      const membrane = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 24, 18),
        new THREE.MeshPhongMaterial({ 
          color: 0x96ceb4,
          transparent: true,
          opacity: 0.2,
          wireframe: true
        })
      );
      group.add(membrane);
      
      const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b })
      );
      nucleus.position.set(0.5, 0.3, 0.2);
      group.add(nucleus);
      
      const mitochondria = new THREE.Mesh(
        new THREE.SphereGeometry(0.3),
        new THREE.MeshPhongMaterial({ color: 0xffa726 })
      );
      mitochondria.position.set(-0.8, -0.4, 0.5);
      group.add(mitochondria);
      
      return group;
    };

    const createPyramid = (): THREE.Mesh => {
      return new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 3.5, 4),
        new THREE.MeshPhongMaterial({ 
          color: 0xd4af37,
          shininess: 100
        })
      );
    };

    const createEarth = (): THREE.Mesh => {
      return new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshPhongMaterial({ 
          color: 0x4ecdc4,
          wireframe: true
        })
      );
    };

    const createChineseFlag = (): THREE.Group => {
      const group = new THREE.Group();
      
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 8),
        new THREE.MeshPhongMaterial({ color: 0x8B4513 })
      );
      pole.position.y = 4;
      group.add(pole);
      
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 2.4),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
      );
      flag.position.set(2, 6.2, 0);
      flag.rotation.y = -Math.PI / 2;
      group.add(flag);
      
      const createStar = (size: number, position: THREE.Vector3): THREE.Mesh => {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(size),
          new THREE.MeshPhongMaterial({ color: 0xffff00 })
        );
        star.position.copy(position);
        return star;
      };
      
      group.add(createStar(0.15, new THREE.Vector3(1.7, 6.8, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.3, 7.0, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.4, 6.6, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.2, 6.3, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.5, 6.4, 0.01)));
      
      return group;
    };

    // 初始化场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c2461);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(15, 15, 10);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4ecdc4, 0.8, 50);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    const models: THREE.Object3D[] = [];
    const cherryBlossoms: THREE.Object3D[] = [];

    // 创建桃花系统
    const createCherryBlossomSystem = (): void => {
      for (let i = 0; i < 30; i++) {
        const blossom = createCherryBlossom();
        blossom.position.set(
          (Math.random() - 0.5) * 40,
          Math.random() * 20 + 10,
          (Math.random() - 0.5) * 40
        );
        
        (blossom.userData as BlossomUserData) = {
          speed: 0.02 + Math.random() * 0.03,
          rotationSpeed: 0.01 + Math.random() * 0.02,
          amplitude: 0.5 + Math.random() * 1,
          timeOffset: Math.random() * Math.PI * 2
        };
        
        scene.add(blossom);
        cherryBlossoms.push(blossom);
      }
    };

    // 学科模型配置
    const subjects = [
      { create: createMathModels, name: '数学', scale: 0.9 },
      { create: createEnglishLetters, name: '英语', scale: 1.0 },
      { create: createLever, name: '物理', scale: 0.7 },
      { create: createMolecules, name: '化学', scale: 1.1 },
      { create: createCell, name: '生物', scale: 1.0 },
      { create: createPyramid, name: '历史', scale: 1.2 },
      { create: createEarth, name: '地理', scale: 1.3 },
      { create: createChineseFlag, name: '政治', scale: 0.8 }
    ];

    // 放置学科模型
    subjects.forEach((subject, index) => {
      const model = subject.create();
      model.scale.setScalar(subject.scale);
      
      const angle = (index / subjects.length) * Math.PI * 2;
      const radius = 14 + Math.random() * 6;
      const height = (Math.random() - 0.5) * 8;
      
      model.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      model.rotation.x = Math.random() * Math.PI;
      model.rotation.y = Math.random() * Math.PI;
      
      (model.userData as ModelUserData) = {
        originalPosition: model.position.clone(),
        orbitRadius: radius,
        orbitSpeed: 0.15 + Math.random() * 0.25,
        rotationSpeed: 0.003 + Math.random() * 0.007,
        floatHeight: 0.8 + Math.random() * 1.5,
        floatSpeed: 0.2 + Math.random() * 0.3,
        angle: angle
      };
      
      scene.add(model);
      models.push(model);
    });

    createCherryBlossomSystem();

    // 星空背景
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 800;
    const starsPositions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount * 3; i++) {
      starsPositions[i] = (Math.random() - 0.5) * 200;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // 控制器
    camera.position.set(0, 8, 25);
    const controls = new OrbitControls(camera, renderer.domElement);

    // 动画循环
    const animate = (): void => {
      requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // 更新学科模型
      models.forEach((model) => {
        const data = model.userData as ModelUserData;
        
        data.angle += data.orbitSpeed * 0.01;
        model.position.x = Math.cos(data.angle) * data.orbitRadius;
        model.position.z = Math.sin(data.angle) * data.orbitRadius;
        model.position.y = data.originalPosition.y + Math.sin(time * data.floatSpeed) * data.floatHeight;
        
        model.rotation.x += data.rotationSpeed;
        model.rotation.y += data.rotationSpeed * 1.3;
      });
      
      // 更新桃花
      cherryBlossoms.forEach((blossom) => {
        const data = blossom.userData as BlossomUserData;
        
        blossom.position.y -= data.speed;
        blossom.rotation.y += data.rotationSpeed;
        blossom.position.x += Math.sin(time + data.timeOffset) * 0.02;
        
        if (blossom.position.y < -10) {
          blossom.position.y = 20;
          blossom.position.x = (Math.random() - 0.5) * 30;
          blossom.position.z = (Math.random() - 0.5) * 30;
        }
      });
      
      stars.rotation.y += 0.0001;
      pointLight.intensity = 0.6 + Math.sin(time) * 0.3;
      
      controls.update();
      renderer.render(scene, camera);
    };

    const handleResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 0 
      }} 
    />
  );
};

export default ThreeDBackground;