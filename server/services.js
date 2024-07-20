import { createClient as createPrismicClient, filter } from '@prismicio/client';
import config from './config.js';

/**
 * @type {PrismicClient}
 */
let prismicClient;

const getPrismicClient = () => {
	if (!prismicClient) {
		prismicClient = createPrismicClient(config.PRISMIC_REPO_NAME || '', {
			accessToken: config.PRISMIC_ACCESS_TOKEN
		});
	}

	return prismicClient;
};

/**
 * @param {Object} _
 * @param {string[]} _.tags
 */
export const fetchWeeknotes = ({ tags }) => {
	return getPrismicClient().getAllByType('weeknotes', {
		predicates: [filter.any('document.tags', tags)],
		orderings: { field: 'my.weeknotes.date', direction: 'desc' }
	});
};

/**
 * @param {WeeknoteDbDoc['uid']} weeknoteUid
 */
export const fetchWeeknote = async (weeknoteUid) => {
	try {
		return await getPrismicClient().getByUID('weeknotes', weeknoteUid);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === 'No documents were returned'
		) {
			return null;
		}

		throw error;
	}
};
