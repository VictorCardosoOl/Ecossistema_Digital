import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DataSchema = z.object({
  profile: z.object({
    name: z.string(),
    subtitle: z.string(),
    avatar: z.string(),
    avatarAlt: z.string()
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url(),
    skills: z.array(z.string()).optional()
  }),
  links: z.array(z.object({
    url: z.string().url(),
    icon: z.string(),
    text: z.string()
  })),
  socials: z.array(z.object({
    url: z.string(),
    icon: z.string(),
    label: z.string()
  })).optional(),
  contact: z.object({
    location: z.string(),
    email: z.string().email(),
    phone: z.string()
  }).optional(),
  footer: z.object({
    year: z.number(),
    name: z.string(),
    url: z.string()
  }).optional()
});

const rawData = JSON.parse(fs.readFileSync(path.resolve(__dirname, './src/config/data.json'), 'utf-8'));
const configData = DataSchema.parse(rawData);

export default defineConfig({
  base: './',
  plugins: [
    handlebars({
      context: configData,
    }),
  ],
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['gsap', 'lenis'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
