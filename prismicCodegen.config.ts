import type { Config } from 'prismic-ts-codegen';
import appConfig from './server/config';

const config: Config = {
	customTypesAPIToken: appConfig.PRISMIC_TYPES_TOKEN,
	models: {
		fetchFromRepository: true
	},
	output: './types.generated.ts',
	repositoryName: appConfig.PRISMIC_REPO_NAME
};

export default config;
