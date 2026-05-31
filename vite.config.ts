import { defineConfig } from 'vite'

export default defineConfig({
    base: '/',
    server: {
        fs: {
            allow: ['.']
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/three')) return 'three'
                    if (id.includes('node_modules/gsap')) return 'gsap'
                }
            }
        }
    },
    
    assetsInclude: ['**/*.glb', '**/*.gltf']
})