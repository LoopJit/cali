import './style.css'
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

THREE.Cache.enabled = true;


export function setBackground(container: HTMLElement, modelUrl: string): () => void {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0.5, 0);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            color1: { value: new THREE.Color(0x0000cd) },
            color2: { value: new THREE.Color(0xffef00) },
            lightDir: { value: new THREE.Vector3(5, 10, 5).normalize() },
        },
        vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vNormal;
      void main() {
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vNormal = normalize(normalMatrix * objectNormal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
        fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 lightDir;
      varying vec3 vNormal;
      void main() {
        float intensity = dot(vNormal, normalize(lightDir));
        float t = smoothstep(-0.2, 0.01, intensity);
        gl_FragColor = vec4(mix(color1, color2, t), 1.0);
      }
    `,
    });

    (material as any).skinning = true;

    let raf = 0;

    const loader = new GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        const model = gltf.scene;
        model.frustumCulled = true;

        scene.traverse(child => { if (child !== model) child.matrixAutoUpdate = false; });

        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = material;
            }
        });

        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        model.position.sub(center);

        const frustum = Math.max(maxDim * 1.2, 1);
        const aspect = width / height;

        camera.left = -frustum * aspect / 2;
        camera.right = frustum * aspect / 2;
        camera.top = frustum / 2;
        camera.bottom = -frustum / 2;
        camera.updateProjectionMatrix();

        let maxScroll = document.body.scrollHeight - window.innerHeight;

        const startPos = new THREE.Vector3(-2.5, 0, 0);
        const endPos = new THREE.Vector3(2, -5, 0);
        const targetPos = new THREE.Vector3();
        const currentPos = new THREE.Vector3().copy(startPos);

        const startQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -19.7, 0));
        const endQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 10, 0));

        function onScroll() {
            maxScroll = document.body.scrollHeight - window.innerHeight;
        }
        window.addEventListener('scroll', onScroll, {passive: false});

        let smoothProgress = 0;

        const animate = () => {
            requestAnimationFrame(animate);

            const targetProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));

            smoothProgress += (targetProgress - smoothProgress) * 0.1;

            model.quaternion.copy(startQuat).slerp(endQuat, smoothProgress);

            targetPos.lerpVectors(startPos, endPos, targetProgress);
            currentPos.lerp(targetPos, 0.08);
            model.position.copy(currentPos);

            renderer.render(scene, camera);
        };
        animate();
    });

    const onResize = () => {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        renderer.setSize(w, h);

        const aspect = w / h;
        const currentFrustum = Math.max(camera.top - camera.bottom, 1) * aspect;
        camera.left = -currentFrustum / 2;
        camera.right = currentFrustum / 2;
        camera.top = currentFrustum / aspect / 2;
        camera.bottom = -currentFrustum / aspect / 2;
        camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        material.dispose();
        if (renderer.domElement.parentElement === container) {
            container.removeChild(renderer.domElement);
        }
    };
}