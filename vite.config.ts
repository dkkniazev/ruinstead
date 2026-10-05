import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    watch: {
      // Local captures and browser diagnostics are not application source files.
      ignored: ['**/yandex-output/**'],
    },
  },
});
