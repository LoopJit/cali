import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

THREE.Cache.enabled = true

export function setBackground(container: HTMLElement, modelUrl: string): () => void {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0.5, 0)

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
        })

    ;(material as any).skinning = true

    let raf = 0
    let running = false
    let model: THREE.Object3D | null = null

    let targetProgress = 0
    let smoothProgress = 0
    const EPSILON = 0.0001

    let maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
    let frustumHeight = 1

    const startPos = new THREE.Vector3(-2.5, 0, 0)
    const endPos = new THREE.Vector3(2, -5, 0)

    const dx = endPos.x - startPos.x
    const dy = endPos.y - startPos.y
    const dz = endPos.z - startPos.z

    let currentX = startPos.x
    let currentY = startPos.y
    let currentZ = startPos.z

    const startQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -19.7, 0))
    const endQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 10, 0))

    let basePosition = new THREE.Vector3()

    const updateScroll = () => {
        maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
        targetProgress = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1)
    }

    const renderLoop = () => {
        if (!model) {
            running = false
            raf = 0
            return
        }

        const diff = targetProgress - smoothProgress
        smoothProgress += diff * 0.1

        const targetX = startPos.x + dx * targetProgress
        const targetY = startPos.y + dy * targetProgress
        const targetZ = startPos.z + dz * targetProgress

        currentX += (targetX - currentX) * 0.08
        currentY += (targetY - currentY) * 0.08
        currentZ += (targetZ - currentZ) * 0.08

        model.position.set(
            basePosition.x + currentX,
            basePosition.y + currentY,
            basePosition.z + currentZ
        )

        model.quaternion.copy(startQuat).slerp(endQuat, smoothProgress)

        renderer.render(scene, camera)

        const positionSettled =
            Math.abs(targetX - currentX) < EPSILON &&
            Math.abs(targetY - currentY) < EPSILON &&
            Math.abs(targetZ - currentZ) < EPSILON

        const rotationSettled = Math.abs(diff) < EPSILON

        if (positionSettled && rotationSettled) {
            running = false
            raf = 0
            return
        }

        raf = requestAnimationFrame(renderLoop)
    }

    const startRenderLoop = () => {
        if (running) return
        running = true
        raf = requestAnimationFrame(renderLoop)
    }

    const onScroll = () => {
        updateScroll()
        startRenderLoop()
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    const loader = new GLTFLoader()
    loader.load(modelUrl, (gltf) => {
        model = gltf.scene
        model.frustumCulled = true

        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = material
            }
        })

        scene.add(model)

        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)

        model.position.sub(center)
        basePosition.copy(model.position)

        frustumHeight = Math.max(maxDim * 1.2, 1)

        const aspect = width / height
        camera.left = -frustumHeight * aspect / 2
        camera.right = frustumHeight * aspect / 2
        camera.top = frustumHeight / 2
        camera.bottom = -frustumHeight / 2
        camera.updateProjectionMatrix()

        updateScroll()
        startRenderLoop()
    })

    const onResize = () => {
        const w = container.clientWidth || window.innerWidth
        const h = container.clientHeight || window.innerHeight

        renderer.setSize(w, h)

        const aspect = w / h
        camera.left = -frustumHeight * aspect / 2
        camera.right = frustumHeight * aspect / 2
        camera.top = frustumHeight / 2
        camera.bottom = -frustumHeight / 2
        camera.updateProjectionMatrix()

        updateScroll()
        startRenderLoop()
    }

    window.addEventListener('resize', onResize)

    return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)

        if (raf) {
            cancelAnimationFrame(raf)
        }

        renderer.dispose()
        material.dispose()

        if (renderer.domElement.parentElement === container) {
            container.removeChild(renderer.domElement)
        }
    }
}