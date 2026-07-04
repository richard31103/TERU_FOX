import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify('production')
    },
    plugins: [react()],
    build: {
        emptyOutDir: true,
        outDir: resolve(__dirname, '../../assets/minigames/tower'),
        cssCodeSplit: false,
        lib: {
            entry: resolve(__dirname, 'src/bridge_entry.jsx'),
            name: 'TeruTowerGameBundle',
            formats: ['iife'],
            fileName: () => 'tower-game.bundle.js'
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) return 'tower-game.css';
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    }
});
