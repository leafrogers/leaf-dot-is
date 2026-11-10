import { createServer } from 'node:http';

// Use synthetic input and remove credentials from the copied Shortcut.
// Only the content type and body are recorded. No request headers are dumped.
const server = createServer(async (request, response) => {
	if (request.method !== 'POST' || request.url !== '/event') {
		response.writeHead(404).end();
		return;
	}
	let size = 0;
	const chunks = [];
	for await (const chunk of request) {
		size += chunk.length;
		if (size > 65536) {
			response.writeHead(413).end('Synthetic input must be under 64 KiB');
			return;
		}
		chunks.push(chunk);
	}
	const bytes = Buffer.concat(chunks);
	const body = bytes.toString('utf8');
	let payload;
	try {
		payload = JSON.parse(body);
	} catch {
		payload = undefined;
	}
	process.stdout.write(
		`${JSON.stringify(
			{
				contentType: request.headers['content-type'] ?? null,
				byteLength: bytes.length,
				body,
				bodyBase64: bytes.toString('base64'),
				validJson: payload !== undefined,
				typeIdType: typeof payload?.typeId,
				timestamp: payload?.timestamp ?? null
			},
			null,
			2
		)}\n`
	);
	response.writeHead(201, { 'Content-Type': 'text/plain;charset=UTF-8' });
	response.end('Created');
});

server.requestTimeout = 15000;
server.listen(8765, '127.0.0.1', () => {
	process.stdout.write(
		'Listening at http://127.0.0.1:8765/event. Stop with Ctrl+C.\n'
	);
});
