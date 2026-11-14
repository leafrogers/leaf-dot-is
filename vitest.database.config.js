import { defineConfig } from 'vitest/config';
import config from './vitest.config.js';

export default defineConfig({
	...config,
	test: {
		...config.test,
		include: ['test/database-queries.integration.js'],
		fileParallelism: false
	}
});
