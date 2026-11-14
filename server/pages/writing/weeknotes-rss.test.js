import { Client } from '@prismicio/client';
import { JSDOM } from 'jsdom';
import supertest from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { weeknote } from '../../../test/fixtures.js';
import app from '../../app.js';
import config from '../../config.js';

const request = supertest(app);
const getAllByType = vi.spyOn(Client.prototype, 'getAllByType');
const originalOrigin = config.PERMALINK_BASE_URL;

beforeEach(() => {
	config.PERMALINK_BASE_URL = 'https://www.example.test';
	getAllByType.mockReset();
});

afterEach(() => {
	config.PERMALINK_BASE_URL = originalOrigin;
});

it('publishes valid XML with ordered items, absolute links, dates and footnote content', async () => {
	const latest = weeknote();
	latest.data.body = [
		...latest.data.body,
		{ type: 'heading2', text: 'Footnotes', spans: [] },
		{ type: 'o-list-item', text: 'A footnote & some detail.', spans: [] }
	];
	const older = weeknote();
	older.uid = 'an-older-week';
	older.data.title = [
		{ type: 'heading1', text: 'An older week & more', spans: [] }
	];
	older.data.date = '2026-01-02T12:00:00+0000';
	getAllByType.mockResolvedValueOnce([latest, older]);
	const { text, headers } = await request
		.get('/writing/weeknotes.rss')
		.expect(200);
	expect(headers['content-type']).toContain('application/xml');
	const xml = new JSDOM(text, { contentType: 'application/xml' });
	try {
		const items = [...xml.window.document.querySelectorAll('channel > item')];
		expect(items).toHaveLength(2);
		expect(
			items.map((item) => item.querySelector('title')?.textContent)
		).toEqual([
			'Dear Internet: A quiet week',
			'Dear Internet: An older week & more'
		]);
		expect(
			items.map((item) => item.querySelector('link')?.textContent)
		).toEqual([
			'https://www.example.test/writing/weeknotes/a-quiet-week',
			'https://www.example.test/writing/weeknotes/an-older-week'
		]);
		expect(items[0].querySelector('pubDate')?.textContent).toBe(
			'Sat, 03 Jan 2026 12:00:00 GMT'
		);
		const content = items[0].getElementsByTagNameNS(
			'http://purl.org/rss/1.0/modules/content/',
			'encoded'
		)[0]?.textContent;
		expect(content).toContain('A walk beside the river.');
		expect(content).toContain('<p>Yours,<br>Leaf x</p>');
		expect(content).toContain('A footnote &amp; some detail.');
	} finally {
		xml.window.close();
	}
});

it('returns a valid empty RSS channel when there are no posts', async () => {
	getAllByType.mockResolvedValueOnce([]);
	const { text } = await request.get('/writing/weeknotes.rss').expect(200);
	const xml = new JSDOM(text, { contentType: 'application/xml' });
	try {
		expect(
			xml.window.document.querySelector('channel > title')?.textContent
		).toBe('Leaf Rogers’ Weeknotes');
		expect(xml.window.document.querySelectorAll('item')).toHaveLength(0);
	} finally {
		xml.window.close();
	}
});
