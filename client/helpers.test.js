import { politeSetInterval } from './helpers.js';

it('updates immediately, waits for the interval, and resumes after a long pause', () => {
	/** @type {FrameRequestCallback} */
	let frame = () => {
		throw new Error('No animation frame was scheduled');
	};
	Object.defineProperty(globalThis, 'requestAnimationFrame', {
		configurable: true,
		value: (/** @type {FrameRequestCallback} */ callback) => {
			frame = callback;
			return 1;
		}
	});
	try {
		let updates = 0;
		politeSetInterval(() => {
			updates++;
		}, 60000);
		expect(updates).toBe(1);
		frame(16);
		frame(59999);
		expect(updates).toBe(1);
		frame(60000);
		expect(updates).toBe(2);
		frame(300000);
		expect(updates).toBe(3);
	} finally {
		Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
	}
});
