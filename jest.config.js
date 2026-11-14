export default {
	collectCoverageFrom: [
		'server/**/*.js',
		'client/**/*.js',
		'shared/**/*.js',
		'scripts/wait-for-circleci.js'
	],
	setupFilesAfterEnv: ['./test/setup.js'],
	watchman: false
};
