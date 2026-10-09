import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Genera le icone PWA e l'apple-touch-icon da public/favicon.svg:
// npm run generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#166534' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#166534' } },
  },
  images: ['public/favicon.svg'],
})
