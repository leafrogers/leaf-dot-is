import { JSDOM } from 'jsdom';
import { expect, it, vi } from 'vitest';

it.each([false, true])(
	'starts the client with timestamps=%s',
	async (hasTimestamps) => {
		const dom = new JSDOM(
			hasTimestamps
				? '<body><p class="group__timestamp"><time datetime="2026-01-03T11:58:00Z">Original timestamp</time></p></body>'
				: '<body><p>No timestamps here</p></body>'
		);
		const requestFrame = vi.fn();
		Object.defineProperties(globalThis, {
			document: { configurable: true, value: dom.window.document },
			Element: { configurable: true, value: dom.window.Element },
			requestAnimationFrame: { configurable: true, value: requestFrame }
		});
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-01-03T12:00:00Z'));
		try {
			vi.resetModules();
			await import('./init.js');
			if (hasTimestamps) {
				expect(document.querySelector('time')?.textContent).toBe(
					'2 minutes ago'
				);
				expect(document.querySelector('button')?.ariaLabel).toBe(
					'Show timestamp'
				);
				expect(requestFrame).toHaveBeenCalledTimes(1);
			} else {
				expect(document.querySelector('button')).toBeNull();
				expect(requestFrame).not.toHaveBeenCalled();
			}
		} finally {
			vi.useRealTimers();
			for (const name of ['document', 'Element', 'requestAnimationFrame']) {
				Reflect.deleteProperty(globalThis, name);
			}
			dom.window.close();
		}
	}
);
