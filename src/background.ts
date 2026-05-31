import './style.css'
import {
    Scene,
    WebGLRenderer,
    OrthographicCamera,
    Vector3,
    Box3,
    Mesh,
    MathUtils,
    Cache, Color, ShaderMaterial, Object3D
} from 'three'

import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { TextPlugin } from "gsap/TextPlugin";

const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')

gsap.registerPlugin(InertiaPlugin,ScrollTrigger,ScrollSmoother,ScrollToPlugin,TextPlugin);


Cache.enabled = true

export function setBackground(container: HTMLElement, modelUrl: string): () => void {
    const w = container.clientWidth
    const h = container.clientHeight
    const WORLD_HEIGHT = 5;
    const ASPECT = 1;
    const WORLD_WIDTH = WORLD_HEIGHT * ASPECT;

    const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = false

    container.appendChild(renderer.domElement)

    const scene = new Scene()

    const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 1000)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, -1, 0)

    camera.left = -WORLD_WIDTH / 2;
    camera.right = WORLD_WIDTH / 2;
    camera.top = WORLD_HEIGHT / 2;
    camera.bottom = -WORLD_HEIGHT / 2;
    camera.updateProjectionMatrix();

    const material = new ShaderMaterial({
            uniforms: {
                color1: { value: new Color(0x0000cd) },
                color2: { value: new Color(0xffef00) },
                lightDir: { value: new Vector3(5, 10, 5).normalize() },
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

    let model: Object3D | null = null

    let frustumHeight = 1

    const loader = new GLTFLoader()
    loader.load(modelUrl, (gltf) => {
        model = gltf.scene

        const box = new Box3().setFromObject(model)
        const center = box.getCenter(new Vector3())
        console.log(center)
        const size = box.getSize(new Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = WORLD_HEIGHT / maxDim * 1.1

        model.frustumCulled = true
        model.scale.setScalar(scale)
        model.position.sub(center)

        model.traverse((child) => {
            if (child instanceof Mesh) {
                child.material = material
            }
        })

        scene.add(model)

        frustumHeight = Math.max(maxDim * 1.2, 1)
        setCamera()

        const anim = {
            rotY: -20.7,
        }

        ScrollTrigger.defaults({
            scroller: "#app"
        });

        const tl1 = gsap.timeline({
            lazy: true,
            scrollTrigger: {
                trigger: "#page1",
                start: "center center",
                end: "+=300%",
                pin: true,
                scrub: 1,
            }
        });

        tl1.to(anim, {
            rotY: -720
        }, 0);

        gsap.set("#dialog1", { xPercent: 200 });
        gsap.set("#dialog2", { xPercent: -200 });

        tl1.to("#dialog1", {
            opacity: 1,
            xPercent: -200
        }, 0);

        tl1.to("#dialog2", {
            xPercent: 200
        }, 0.1);

        //@ts-ignore
        gsap.timeline({
            lazy: true,
            scrollTrigger: {
                trigger: "#page2",
                start: "center bottom",
                end: "+=50% top",
                pin: true,
                scrub: 1
            }
        });

        gsap.to("#dialog3", {
            lazy: true,
            xPercent: -140,
            ease: "power1.inOut",

            scrollTrigger:{
                trigger: "#page2",
                start: "bottom top",
                scrub: 1.2,
                pin: true,
            }
        })



        const render = () => {
            if (!model) return

            //dont render if out of view
            if (!frustumHeight) return
            model.rotation.y = MathUtils.degToRad(anim.rotY)

            renderer.render(scene, camera)
        }

        gsap.ticker.add(render)

        render()
    });

    const onResize = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        renderer.setSize(w, h)

        setCamera()
    }

    function setCamera() {
        const aspect = container.clientWidth / container.clientHeight
        camera.left = -frustumHeight * aspect / 2
        camera.right = frustumHeight * aspect / 2
        camera.top = frustumHeight / 2
        camera.bottom = -frustumHeight / 2
        camera.updateProjectionMatrix()
    }

    window.addEventListener('resize', onResize)

    return () => {
        window.removeEventListener('resize', onResize)

        renderer.dispose()
        material.dispose()

        if (renderer.domElement.parentElement === container) {
            container.removeChild(renderer.domElement)
        }
    }
}