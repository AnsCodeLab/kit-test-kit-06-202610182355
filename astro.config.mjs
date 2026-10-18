import { defineConfig } from 'astro/config';

// With KIT_FIXTURE=1 the component fixture page is added. It is only built by
// `npm run build:fixture` into dist-fixture/, never into dist/.
const fixture = {
  name: 'component-fixture',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (process.env.KIT_FIXTURE === '1') {
        injectRoute({ pattern: '/fixture/components', entrypoint: './src/fixtures/components.astro' });
      }
    },
  },
};

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [fixture],
});
