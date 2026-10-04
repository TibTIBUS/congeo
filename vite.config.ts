import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig(({command})=>({base:command==='build'?process.env.VITE_BASE_PATH||'/congeo/':'/',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},build:{rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),admin:fileURLToPath(new URL('./admin/index.html',import.meta.url))}}},server:{host:'127.0.0.1'}}));
