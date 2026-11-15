import { JSDOM } from 'jsdom';
import { expect, it, vi } from 'vitest';
import bootstrapper from './bootstrapper.js';

it.each([false, true])(
	'loads enhancements and handles load failure=%s',
	(fails) => {
		const dom = new JSDOM(
			'<html class="core"><head><script></script></head></html>',
			{ runScripts: 'outside-only', url: 'https://www.example.test' }
		);
		try {
			const warn = vi
				.spyOn(dom.window.console, 'warn')
				.mockReturnValue(undefined);
			dom.window.eval(bootstrapper);
			const script = dom.window.document.querySelector('script[src]');
			expect(script?.getAttribute('src')).toBe('/js/init.js');
			expect(script?.nextElementSibling?.tagName).toBe('SCRIPT');
			expect(dom.window.document.documentElement.className).toBe('enhanced');
			if (fails) {
				script?.dispatchEvent(new dom.window.Event('error'));
				expect(dom.window.document.documentElement.className).toBe('core');
				expect(warn).toHaveBeenCalledTimes(1);
			} else {
				expect(warn).not.toHaveBeenCalled();
			}
		} finally {
			dom.window.close();
		}
	}
);
