import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 自定义轨道控制器 - 处理相机旋转和缩放
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
    this.enableDamping = true; // 启用阻尼效果，使旋转更平滑
    this.dampingFactor = 0.05;
    this.rotateSpeed = 1.0;
    
    // 球面坐标系统 - 用于计算相机位置
    this.spherical = { radius: 25, phi: Math.PI / 3, theta: 0 };
    this.target = new THREE.Vector3(); // 相机目标点
    this.rotateStart = new THREE.Vector2();
    this.isRotating = false;
    
    this.bindEvents();
    this.update();
  }
  
  // 绑定交互事件
  bindEvents() {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  // 鼠标按下事件 - 开始旋转
  onMouseDown(event: MouseEvent) {
    if (!this.enabled) return;
    this.rotateStart.set(event.clientX, event.clientY);
    this.isRotating = true;
    this.domElement.style.cursor = 'grabbing';
  }
  
  // 鼠标移动事件 - 处理旋转
  onMouseMove(event: MouseEvent) {
    if (!this.enabled || !this.isRotating) return;
    
    const rotateEnd = new THREE.Vector2(event.clientX, event.clientY);
    // 计算旋转差值并应用旋转速度
    const rotateDelta = new THREE.Vector2().subVectors(rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed * 0.01);
    
    // 更新球面坐标
    this.spherical.theta -= rotateDelta.x;
    // 限制phi角度，避免相机翻转
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - rotateDelta.y));
    
    this.rotateStart.copy(rotateEnd);
    this.update();
  }
  
  // 鼠标释放事件 - 结束旋转
  onMouseUp() {
    this.isRotating = false;
    this.domElement.style.cursor = 'grab';
  }
  
  // 滚轮事件 - 处理缩放
  onWheel(event: WheelEvent) {
    if (!this.enabled) return;
    event.preventDefault();
    // 根据滚轮方向调整相机距离
    this.spherical.radius *= event.deltaY > 0 ? 1.05 : 0.95;
    // 限制缩放范围
    this.spherical.radius = Math.max(10, Math.min(60, this.spherical.radius));
    this.update();
  }
  
  // 更新相机位置
  update() {
    const sinPhi = Math.sin(this.spherical.phi);
    // 根据球面坐标计算相机位置
    this.camera.position.x = this.spherical.radius * sinPhi * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.spherical.radius * sinPhi * Math.cos(this.spherical.theta);
    this.camera.lookAt(this.target);
  }
}

// 模型用户数据接口 - 存储动画相关参数
interface ModelUserData {
  originalPosition: THREE.Vector3;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  floatHeight: number;
  floatSpeed: number;
  angle: number;
}

// 樱花用户数据接口 - 存储动画相关参数
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

    // 创建化学键模型
    const createBond = (start: THREE.Vector3, end: THREE.Vector3, color: number = 0xcccccc): THREE.Mesh => {
      const length = start.distanceTo(end);
      const bond = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, length, 8),
        new THREE.MeshPhongMaterial({ color })
      );
      
      // 定位并旋转化学键使其连接两个原子
      bond.position.copy(start).lerp(end, 0.5);
      bond.lookAt(end);
      bond.rotateX(Math.PI / 2);
      
      return bond;
    };

    // 创建樱花模型
    const createCherryBlossom = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 创建5个花瓣
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
        petal.scale.set(1, 0.3, 1); // 拉伸花瓣形状
        group.add(petal);
      }
      
      // 创建花蕊
      const stamen = new THREE.Mesh(
        new THREE.SphereGeometry(0.08),
        new THREE.MeshPhongMaterial({ color: 0xffd700 })
      );
      group.add(stamen);
      
      return group;
    };

    // 创建数学模型组合
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
          wireframe: true // 线框模式
        })
      );
      sphere.position.set(2.5, 0, 0);
      group.add(sphere);
      
      return group;
    };

    // 创建英文字母模型
    const createEnglishLetters = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 创建单个字母模型
      const createLetter = (letter: string, color: number, position: THREE.Vector3): THREE.Mesh => {
        let geometry: THREE.BufferGeometry;
        // 根据字母选择不同的几何体
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

    // 创建杠杆模型
    const createLever = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 支点
      const fulcrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 0.4),
        new THREE.MeshPhongMaterial({ color: 0x8B4513 })
      );
      fulcrum.position.y = -0.2;
      group.add(fulcrum);
      
      // 杠杆
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.1, 0.3),
        new THREE.MeshPhongMaterial({ color: 0xcccccc })
      );
      beam.position.y = 0;
      group.add(beam);
      
      // 重物1
      const weight1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.8, 0.5),
        new THREE.MeshPhongMaterial({ color: 0xff4444 })
      );
      weight1.position.set(-1.5, -0.5, 0);
      group.add(weight1);
      
      // 重物2
      const weight2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.4),
        new THREE.MeshPhongMaterial({ color: 0x4444ff })
      );
      weight2.position.set(1.5, -0.3, 0);
      group.add(weight2);
      
      return group;
    };

    // 创建分子模型
    const createMolecules = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 甲烷分子
      const methane = new THREE.Group();
      const carbon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3),
        new THREE.MeshPhongMaterial({ color: 0x333333 })
      );
      methane.add(carbon);
      
      // 氢原子位置 (正四面体结构)
      const vertices = [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0.94, -0.33, 0),
        new THREE.Vector3(-0.47, -0.33, 0.82),
        new THREE.Vector3(-0.47, -0.33, -0.82)
      ];
      
      // 添加氢原子和化学键
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

    // 创建细胞模型
    const createCell = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 细胞膜
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
      
      // 细胞核
      const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b })
      );
      nucleus.position.set(0.5, 0.3, 0.2);
      group.add(nucleus);
      
      // 线粒体
      const mitochondria = new THREE.Mesh(
        new THREE.SphereGeometry(0.3),
        new THREE.MeshPhongMaterial({ color: 0xffa726 })
      );
      mitochondria.position.set(-0.8, -0.4, 0.5);
      group.add(mitochondria);
      
      return group;
    };

    // 创建金字塔模型 (代表历史)
    const createPyramid = (): THREE.Mesh => {
      return new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 3.5, 4),
        new THREE.MeshPhongMaterial({ 
          color: 0xd4af37,
          shininess: 100
        })
      );
    };

    // 创建地球模型 (代表地理)
    const createEarth = (): THREE.Mesh => {
      return new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshPhongMaterial({ 
          color: 0x4ecdc4,
          wireframe: true
        })
      );
    };

    // 创建国旗模型 (代表政治)
    const createChineseFlag = (): THREE.Group => {
      const group = new THREE.Group();
      
      // 旗杆
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 8),
        new THREE.MeshPhongMaterial({ color: 0x8B4513 })
      );
      pole.position.y = 4;
      group.add(pole);
      
      // 旗面
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 2.4),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
      );
      flag.position.set(2, 6.2, 0);
      flag.rotation.y = -Math.PI / 2;
      group.add(flag);
      
      // 创建星星
      const createStar = (size: number, position: THREE.Vector3): THREE.Mesh => {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(size),
          new THREE.MeshPhongMaterial({ color: 0xffff00 })
        );
        star.position.copy(position);
        return star;
      };
      
      // 添加五角星
      group.add(createStar(0.15, new THREE.Vector3(1.7, 6.8, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.3, 7.0, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.4, 6.6, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.2, 6.3, 0.01)));
      group.add(createStar(0.08, new THREE.Vector3(2.5, 6.4, 0.01)));
      
      return group;
    };

    // 初始化场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c2461); // 深蓝色背景
    
    // 初始化相机和渲染器
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 平衡性能与画质
    container.appendChild(renderer.domElement);

    // 设置光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // 环境光
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // 主方向光
    directionalLight.position.set(15, 15, 10);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4ecdc4, 0.8, 50); // 点光源
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // 存储模型引用
    const models: THREE.Object3D[] = [];
    const cherryBlossoms: THREE.Object3D[] = [];

    // 创建樱花系统
    const createCherryBlossomSystem = (): void => {
      for (let i = 0; i < 30; i++) {
        const blossom = createCherryBlossom();
        blossom.position.set(
          (Math.random() - 0.5) * 40,
          Math.random() * 20 + 10,
          (Math.random() - 0.5) * 40
        );
        
        // 存储樱花动画参数
        (blossom.userData as BlossomUserData) = {
          speed: 0.02 + Math.random() * 0.03, // 下落速度
          rotationSpeed: 0.01 + Math.random() * 0.02, // 旋转速度
          amplitude: 0.5 + Math.random() * 1, // 左右摇摆幅度
          timeOffset: Math.random() * Math.PI * 2 // 动画时间偏移，使动画不同步
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
      
      // 计算圆形轨道位置
      const angle = (index / subjects.length) * Math.PI * 2;
      const radius = 14 + Math.random() * 6; // 随机半径，使轨道不完美圆形
      const height = (Math.random() - 0.5) * 8; // 随机高度
      
      model.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      // 随机初始旋转
      model.rotation.x = Math.random() * Math.PI;
      model.rotation.y = Math.random() * Math.PI;
      
      // 存储模型动画参数
      (model.userData as ModelUserData) = {
        originalPosition: model.position.clone(),
        orbitRadius: radius,
        orbitSpeed: 0.15 + Math.random() * 0.25, // 轨道运行速度
        rotationSpeed: 0.003 + Math.random() * 0.007, // 自转速度
        floatHeight: 0.8 + Math.random() * 1.5, // 浮动高度
        floatSpeed: 0.2 + Math.random() * 0.3, // 浮动速度
        angle: angle // 当前轨道角度
      };
      
      scene.add(model);
      models.push(model);
    });

    createCherryBlossomSystem();

    // 创建星空背景
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 800;
    const starsPositions = new Float32Array(starsCount * 3);
    
    // 随机生成星星位置
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

    // 初始化控制器
    camera.position.set(0, 8, 25);
    const controls = new OrbitControls(camera, renderer.domElement);

    // 动画循环
    const animate = (): void => {
      requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // 更新学科模型动画
      models.forEach((model) => {
        const data = model.userData as ModelUserData;
        
        // 轨道运动
        data.angle += data.orbitSpeed * 0.01;
        model.position.x = Math.cos(data.angle) * data.orbitRadius;
        model.position.z = Math.sin(data.angle) * data.orbitRadius;
        
        // 上下浮动
        model.position.y = data.originalPosition.y + Math.sin(time * data.floatSpeed) * data.floatHeight;
        
        // 自转
        model.rotation.x += data.rotationSpeed;
        model.rotation.y += data.rotationSpeed * 1.3;
      });
      
      // 更新樱花动画
      cherryBlossoms.forEach((blossom) => {
        const data = blossom.userData as BlossomUserData;
        
        // 下落运动
        blossom.position.y -= data.speed;
        // 旋转
        blossom.rotation.y += data.rotationSpeed;
        // 左右摇摆
        blossom.position.x += Math.sin(time + data.timeOffset) * 0.02;
        
        // 樱花超出边界后重置位置
        if (blossom.position.y < -10) {
          blossom.position.y = 20;
          blossom.position.x = (Math.random() - 0.5) * 30;
          blossom.position.z = (Math.random() - 0.5) * 30;
        }
      });
      
      // 星空缓慢旋转
      stars.rotation.y += 0.0001;
      // 点光源呼吸效果
      pointLight.intensity = 0.6 + Math.sin(time) * 0.3;
      
      controls.update();
      renderer.render(scene, camera);
    };

    // 窗口大小调整处理
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