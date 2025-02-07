import { createClient as createPrismicClient, filter } from '@prismicio/client';
import { Pool } from 'postgres-pool';
import config from './config.js';

/**
 * @type {PrismicClient}
 */
let prismicClient;

const pool = new Pool({
	connectionString: config.PG_CONNECTION_STRING || '',
	connectionTimeoutMillis: 16_000,
	idleTimeoutMillis: 8_000,
	poolSize: 8
});

[
	'connectionAddedToPool',
	'connectionIdle',
	'connectionRemovedFromIdlePool',
	'connectionRemovedFromPool',
	'connectionRequestDequeued',
	'connectionRequestQueued',
	'error',
	'idleConnectionActivated',
	'queryDeniedForConnectionError',
	'queryDeniedForReadOnlyTransaction',
	'retryConnectionOnError',
	'waitingForDatabaseToStart'
].forEach((event) => {
	// @ts-ignore
	pool.on(event, (something) => {
		console.log(
			`IN ${event}`,
			JSON.stringify(
				something,
				(_, v) => (typeof v === 'bigint' ? v.toString() : v),
				2
			)
		);
	});
});

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

/**
 * @returns {Promise<Grooklet[]>}
 */
export const fetchGrooklets = async () => {
	let grooklets = [];

	try {
		const result = await pool.query(`select * from lis_grooklets`);
		grooklets = result.rows;
	} catch (error) {
		// @ts-ignore
		throw new Error(`Error fetching grooklets: ${error.message}`);
	}

	return grooklets;
};

export const fetchMeEvents = async () => {
	let meEvents = [];

	try {
		const result = await pool.query(`
			select meta,title,type,type_short,timestamp
			from lis_me_events
			join lis_me_event_types on type_id = lis_me_event_types.id
			where timestamp >= current_date at time zone 'UTC' - interval '6 days'
			order by timestamp desc
			limit 200
		`);
		meEvents = result.rows;
	} catch (error) {
		// @ts-ignore
		throw new Error(`Error fetching me events: ${error.message}`);
	}

	return meEvents;
};
