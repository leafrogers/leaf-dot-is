import * as prismic from '@prismicio/client';
import config from './config.js';

/**
 * @type {PrismicClient}
 */
let dbClient;

const getDbClient = () => {
	if (!dbClient) {
		dbClient = prismic.createClient(config.DB_REPO_NAME || '', {
			accessToken: config.DB_ACCESS_TOKEN
		});
	}

	return dbClient;
};

/**
 *
 * @param {Object} _
 * @param {string[]} _.tags
 */
export const fetchWeeknotes = ({ tags }) => {
	return getDbClient().getAllByType('weeknotes', {
		predicates: [prismic.predicate.any('document.tags', tags)],
		orderings: { field: 'my.weeknotes.date', direction: 'desc' }
	});
};

/**
 * @param {WeeknoteDbDoc['uid']} weeknoteUid
 */
export const fetchWeeknote = async (weeknoteUid) => {
	try {
		return await getDbClient().getByUID('weeknotes', weeknoteUid);
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
