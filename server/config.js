/**
 * @param {object} object
 */
export const assertNoUndefinedValues = (object) => {
	const keysWithUndefinedValues = [];

	for (const [key, value] of Object.entries(object)) {
		if (typeof value === 'undefined') {
			keysWithUndefinedValues.push(key);
		}
	}

	if (keysWithUndefinedValues.length) {
		throw new Error(
			`Expected all config variables to be defined but found the following undefined variables: ${keysWithUndefinedValues.join(
				', '
			)}.`
		);
	}
};

const config = {
	APP_FRIENDLY_NAME: 'leaf.is',
	APP_FRIENDLY_DESCRIPTION: 'The personal website of Leaf Rogers',
	BASE_URL: process.env.BASE_URL,
	DB_ACCESS_TOKEN: process.env.DB_ACCESS_TOKEN,
	DB_TYPES_TOKEN: process.env.DB_TYPES_TOKEN,
	DB_REPO_NAME: process.env.DB_REPO_NAME,
	IS_PRODUCTION: process.env.NODE_ENV === 'production',
	PERMALINK_BASE_URL: process.env.PERMALINK_BASE_URL,
	PORT: process.env.PORT || 3001,
	USES_CLIENT_JS: false
};

assertNoUndefinedValues(config);

export default config;
