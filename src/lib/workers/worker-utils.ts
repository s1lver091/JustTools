/**
 * Typed Web Worker utility for JustTools.
 *
 * Provides a typed wrapper around the native Worker API with:
 * - Request/response correlation via unique IDs
 * - Promise-based message passing
 * - Error handling
 * - Proper cleanup via terminate()
 *
 * Usage (main thread):
 *   const worker = createTypedWorker<MyRequest, MyResponse>(
 *     new Worker(new URL('./my.worker.ts', import.meta.url), { type: 'module' })
 *   );
 *   const result = await worker.request({ type: 'doSomething', payload: data });
 *   worker.terminate();
 *
 * Usage (worker):
 *   self.onmessage = (e: MessageEvent<WorkerMessage<MyRequest>>) => {
 *     const { id, payload } = e.data;
 *     // process...
 *     self.postMessage({ id, payload: result });
 *   };
 */

export interface WorkerMessage<T> {
	id: string;
	type: string;
	payload: T;
	error?: string;
}

export interface TypedWorker<TRequest, TResponse> {
	/** Send a typed request to the worker and await the response. */
	request(type: string, payload: TRequest): Promise<TResponse>;
	/** Terminate the worker immediately. */
	terminate(): void;
}

export function createTypedWorker<TRequest, TResponse>(
	worker: Worker
): TypedWorker<TRequest, TResponse> {
	const pending = new Map<
		string,
		{
			resolve: (value: TResponse) => void;
			reject: (reason: Error) => void;
		}
	>();

	worker.onmessage = (e: MessageEvent<WorkerMessage<TResponse>>) => {
		const { id, payload, error } = e.data;
		const handler = pending.get(id);
		if (!handler) return;
		pending.delete(id);

		if (error) {
			handler.reject(new Error(error));
		} else {
			handler.resolve(payload);
		}
	};

	worker.onerror = (e) => {
		// Reject all pending requests on unrecoverable worker error
		const err = new Error(e.message || 'Worker error');
		for (const [, handler] of pending) {
			handler.reject(err);
		}
		pending.clear();
	};

	return {
		request(type: string, payload: TRequest): Promise<TResponse> {
			return new Promise((resolve, reject) => {
				const id = crypto.randomUUID();
				pending.set(id, { resolve, reject });

				const message: WorkerMessage<TRequest> = { id, type, payload };
				worker.postMessage(message);
			});
		},

		terminate() {
			// Reject all pending
			const err = new Error('Worker terminated');
			for (const [, handler] of pending) {
				handler.reject(err);
			}
			pending.clear();
			worker.terminate();
		}
	};
}
