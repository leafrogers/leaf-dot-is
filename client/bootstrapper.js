export default `
	const docEl = document.documentElement;
	const currentScript = document.scripts[document.scripts.length - 1];
	const script = document.createElement('script');

	docEl.classList.remove('core');
	docEl.classList.add('enhanced');

	script.onerror = () => {
		if (docEl.classList.contains('enhanced')) {
			console.warn('Script loading failed. Reverting to core experience.');
			docEl.classList.add('core');
			docEl.classList.remove('enhanced');
		}
	};
	script.async = false;
	script.src = '/js/init.js';

	currentScript.parentNode.insertBefore(script, currentScript);
`;
