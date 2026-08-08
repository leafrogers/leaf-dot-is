/**
 * @param {number} frequency
 * @param {() => void} func
 * @param {unknown[]} args
 */
export const politeSetInterval = (func, frequency, ...args) => {
	let previousTimestamp = 0;

	/**
	 * @param {number} now
	 */
	function render(now) {
		if (!previousTimestamp || now - previousTimestamp >= frequency) {
			previousTimestamp = now;
			// @ts-expect-error
			func(...args);
		}

		requestAnimationFrame(render);
	}

	render(0);
};
