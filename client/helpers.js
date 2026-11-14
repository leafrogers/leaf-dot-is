/**
 * @param {number} frequency
 * @param {() => void} func
 * @param {unknown[]} args
 */
export const politeSetInterval = (func, frequency, ...args) => {
	/** @type {number | undefined} */
	let previousTimestamp;

	/**
	 * @param {number} now
	 */
	function render(now) {
		if (
			previousTimestamp === undefined ||
			now - previousTimestamp >= frequency
		) {
			previousTimestamp = now;
			// @ts-expect-error
			func(...args);
		}

		requestAnimationFrame(render);
	}

	render(0);
};
