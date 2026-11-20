import { Client } from '@prismicio/client';
import { parse } from 'node-html-parser';
import supertest from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { weeknote } from '../../../test/fixtures.js';
import app from '../../app.js';
import config from '../../config.js';

const request = supertest(app);
const getByUID = vi.spyOn(Client.prototype, 'getByUID');
const originalProduction = config.IS_PRODUCTION;

beforeEach(() => {
	getByUID.mockReset().mockResolvedValue(weeknote());
	vi.spyOn(console, 'debug').mockReturnValue();
});

afterEach(() => {
	config.IS_PRODUCTION = originalProduction;
});

it('renders the requested weeknote with its body, custom date, title and navigation', async () => {
	const { text } = await request
		.get('/writing/weeknotes/a-quiet-week')
		.expect(200);
	const page = parse(text);
	expect(getByUID).toHaveBeenCalledWith('weeknotes', 'a-quiet-week');
	expect(page.querySelector('h1')?.textContent).toBe('A quiet week');
	expect(page.querySelector('title')?.textContent).toBe(
		'A quiet week — leaf.is'
	);
	expect(page.querySelector('main')?.textContent).toContain(
		'A walk beside the river.'
	);
	expect(page.querySelector('.published')?.textContent).toBe('Sat 3rd Jan ’26');
	for (const path of ['/', '/writing', '/writing/weeknotes']) {
		expect(page.querySelector(`nav a[href="${path}"]`)).not.toBeNull();
	}
	expect(page.querySelector('a[href="#top"]')).not.toBeNull();
});

it('uses the publication date when a weeknote has no custom date', async () => {
	const doc = weeknote();
	doc.data.date = null;
	getByUID.mockResolvedValueOnce(doc);
	const { text } = await request
		.get('/writing/weeknotes/a-quiet-week')
		.expect(200);
	expect(parse(text).querySelector('.published')?.textContent).toBe(
		'Sun 4th Jan ’26'
	);
});

it('preserves rich text markup, escaped text and preformatted whitespace', async () => {
	const doc = weeknote();
	const code = 'const title = "Fish & chips";\n  return title;\n\n';
	doc.data.body = [
		{
			type: 'paragraph',
			text: 'Fish & chips <today>',
			spans: [{ type: 'strong', start: 0, end: 4 }]
		},
		{ type: 'preformatted', text: code, spans: [] }
	];
	getByUID.mockResolvedValueOnce(doc);
	const { text } = await request
		.get('/writing/weeknotes/a-quiet-week')
		.expect(200);
	const page = parse(text);
	expect(page.querySelector('main p strong')?.textContent).toBe('Fish');
	expect(page.querySelector('main p')?.textContent).toBe(
		'Fish & chips <today>'
	);
	expect(page.querySelector('main today')).toBeNull();
	expect(page.querySelector('pre')?.textContent).toBe(code);
});

it('connects heading and body footnote references to their notes and return links', async () => {
	const doc = weeknote();
	doc.data.title = [{ type: 'heading1', text: 'A quiet week[1]', spans: [] }];
	doc.data.body = [
		{ type: 'paragraph', text: 'A walk[2].', spans: [] },
		{ type: 'heading2', text: 'Footnotes', spans: [] },
		{ type: 'o-list-item', text: 'First note', spans: [] },
		{ type: 'o-list-item', text: 'Second note', spans: [] }
	];
	getByUID.mockResolvedValueOnce(doc);
	const { text } = await request
		.get('/writing/weeknotes/a-quiet-week')
		.expect(200);
	const page = parse(text);
	expect(page.querySelector('title')?.textContent).toBe(
		'A quiet week — leaf.is'
	);
	for (const number of [1, 2]) {
		expect(
			page.querySelector(`#footnote-source-${number}`)?.getAttribute('href')
		).toBe(`#footnote-${number}`);
		expect(page.querySelector(`#footnote-${number}`)?.textContent).toContain(
			number === 1 ? 'First note' : 'Second note'
		);
		expect(
			page.querySelector(`#footnote-${number} a`)?.getAttribute('href')
		).toBe(`#footnote-source-${number}`);
	}
	expect(
		page.querySelector('.footnotes-heading .visually-hidden')?.textContent
	).toBe('Footnotes');
	expect(
		page.querySelector('.valediction')?.nextElementSibling?.classNames
	).toContain('footnotes-heading');
});

it('returns the public 404 when Prismic reports a missing document', async () => {
	getByUID.mockRejectedValueOnce(new Error('No documents were returned'));
	const { text } = await request.get('/writing/weeknotes/missing').expect(404);
	expect(text).toContain('Page not found.');
});

it('returns an uncached public 500 for other Prismic failures', async () => {
	config.IS_PRODUCTION = true;
	getByUID.mockRejectedValueOnce(new Error('Private Prismic failure'));
	const { text, headers } = await request
		.get('/writing/weeknotes/a-quiet-week')
		.expect(500);
	expect(text).toContain('Something went wrong.');
	expect(text).not.toContain('Private Prismic failure');
	expect(headers['cache-control']).toContain('no-store');
});
