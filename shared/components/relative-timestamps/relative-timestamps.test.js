import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { getRelativeTime } from './get-relative-time.js';
import { setUpRelativeTimestamps } from './index.js';

const now = new Date('2026-01-03T12:00:00Z');

it.each([
	[0, 'now'],
	[-59, '59 seconds ago'],
	[-60, '60 seconds ago'],
	[-61, '1 minute ago'],
	[-3600, '60 minutes ago'],
	[-3601, '1 hour ago'],
	[-86400, '24 hours ago'],
	[-86401, 'yesterday'],
	[-31536001, 'last year'],
	[61, 'in 1 minute'],
	[86401, 'tomorrow']
])('formats an offset of %s seconds as %s', (seconds, expected) => {
	expect(getRelativeTime(new Date(now.getTime() + seconds * 1000), now)).toBe(
		expected
	);
});

describe('timestamp interactions', () => {
	/** @type {import('jsdom').JSDOM} */
	let dom;
	/** @type {FrameRequestCallback} */
	let frame;

	beforeEach(() => {
		dom = new JSDOM(
			'<body><p><time datetime="2026-01-03T11:58:00Z"></time></p><p><time datetime="2026-01-03T11:00:00Z"></time></p></body>'
		);
		Object.defineProperties(globalThis, {
			document: { configurable: true, value: dom.window.document },
			Element: { configurable: true, value: dom.window.Element },
			requestAnimationFrame: {
				configurable: true,
				value: (/** @type {FrameRequestCallback} */ callback) => {
					frame = callback;
					return 1;
				}
			}
		});
		jest.useFakeTimers({ doNotFake: ['requestAnimationFrame'] });
		jest.setSystemTime(now);
		setUpRelativeTimestamps([...document.querySelectorAll('time')]);
	});

	afterEach(() => {
		jest.useRealTimers();
		for (const name of ['document', 'Element', 'requestAnimationFrame']) {
			Reflect.deleteProperty(globalThis, name);
		}
		dom.window.close();
	});

	it('renders relative text, then updates it as time passes', () => {
		expect(document.querySelector('time')?.textContent).toBe('2 minutes ago');
		jest.setSystemTime(new Date(now.getTime() + 60000));
		frame(60000);
		expect(document.querySelector('time')?.textContent).toBe('3 minutes ago');
	});

	it('exposes the absolute date through an accessible toggle', () => {
		const button = document.querySelector('button');
		expect(button?.ariaLabel).toBe('Show timestamp');
		expect(button?.ariaExpanded).toBe('false');
		expect(button?.nextElementSibling?.textContent).toBe('03/01/2026, 11:58');
		button?.click();
		expect(button?.ariaExpanded).toBe('true');
		button?.click();
		expect(button?.ariaExpanded).toBe('false');
	});

	it('closes open timestamps on an outside click', () => {
		const buttons = [...document.querySelectorAll('button')];
		for (const button of buttons) {
			button.click();
		}
		expect(buttons.every((button) => button.ariaExpanded === 'true')).toBe(
			true
		);
		document.body.click();
		expect(buttons.every((button) => button.ariaExpanded === 'false')).toBe(
			true
		);
	});

	it('closes open timestamps with Escape', () => {
		const button = document.querySelector('button');
		button?.click();
		document.body.dispatchEvent(
			new dom.window.KeyboardEvent('keyup', { key: 'Escape', bubbles: true })
		);
		expect(button?.ariaExpanded).toBe('false');
	});
});
