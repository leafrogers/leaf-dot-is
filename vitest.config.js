import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Vite supplies '/' for BASE_URL; the application uses an empty test prefix.
		env: { BASE_URL: '' },
		include: ['**/*.test.js'],
		setupFiles: ['./test/setup.js'],
		sequence: { hooks: 'list' },
		coverage: {
			provider: 'v8',
			include: [
				'server/**/*.js',
				'client/**/*.js',
				'shared/**/*.js',
				'scripts/wait-for-circleci.js'
			],
			exclude: ['**/*.test.js'],
			reporter: ['text', 'json', 'html', 'lcov']
		}
	}
});
