/// <reference types="vitest" />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'node' if backend only
  },
  plugins: [tailwindcss()],
});
