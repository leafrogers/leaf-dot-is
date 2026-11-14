/** @returns {WeeknoteDbDoc} */
export const weeknote = () => ({
	id: 'test-weeknote',
	uid: 'a-quiet-week',
	type: 'weeknotes',
	href: 'https://test.invalid/documents/test-weeknote',
	url: null,
	tags: ['live'],
	first_publication_date: '2026-01-04T12:00:00+0000',
	last_publication_date: '2026-01-04T12:00:00+0000',
	slugs: ['a-quiet-week'],
	linked_documents: [],
	lang: 'en-gb',
	alternate_languages: [],
	data: {
		date: '2026-01-03T12:00:00+0000',
		title: [{ type: 'heading1', text: 'A quiet week', spans: [] }],
		body: [{ type: 'paragraph', text: 'A walk beside the river.', spans: [] }]
	}
});
