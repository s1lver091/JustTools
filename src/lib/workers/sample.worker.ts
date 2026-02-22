/**
 * Sample worker to verify the worker infrastructure works.
 * Receives a number and returns its square.
 */

import type { WorkerMessage } from './worker-utils';

interface SquareRequest {
	value: number;
}

interface SquareResponse {
	result: number;
}

const FALLBACK_RESULT = 0;

function handleSquare(
	id: string,
	payload: SquareRequest
): WorkerMessage<SquareResponse> {
	const result = payload.value * payload.value;
	return { id, type: 'square', payload: { result } };
}

function buildError(
	id: string,
	type: string,
	message: string
): WorkerMessage<SquareResponse> {
	return { id, type, payload: { result: FALLBACK_RESULT }, error: message };
}

self.onmessage = (e: MessageEvent<WorkerMessage<SquareRequest>>) => {
	const { id, type, payload } = e.data;

	try {
		if (type === 'square') {
			self.postMessage(handleSquare(id, payload));
		} else {
			self.postMessage(buildError(id, type, `Unknown message type: ${type}`));
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		self.postMessage(buildError(id, type, message));
	}
};
