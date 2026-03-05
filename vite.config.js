import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'pdf-highlighter';

  return {
    plugins: [react()],
    base: command === 'serve' ? '/' : `/${repoName}/`,
  };
});
