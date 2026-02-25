const INITIAL_CHUNK_SIZE = 16384; // 16 KB
const MAX_CHUNK_SIZE = 131072; // 128 KB
const MIN_CHUNK_SIZE = 16384; // 16 KB
const BUFFER_HIGH_THRESHOLD = 1048576; // 1 MB - pause sending
const BUFFER_LOW_THRESHOLD = 262144; // 256 KB - resume sending
const BUFFER_CHECK_INTERVAL_MS = 50;
const SPEED_WINDOW_MS = 3000; // Rolling average window

export interface FileMetadata {
	name: string;
	size: number;
	mimeType: string;
	totalChunks: number;
	chunkSize: number;
}

interface ControlMessage {
	type: 'metadata' | 'complete' | 'error' | 'all-complete';
	name?: string;
	size?: number;
	mimeType?: string;
	totalChunks?: number;
	chunkSize?: number;
	error?: string;
	fileIndex?: number;
	totalFiles?: number;
}

export interface TransferProgress {
	currentFile: string;
	currentFileIndex: number;
	totalFiles: number;
	fileBytesSent: number;
	fileTotalBytes: number;
	totalBytesSent: number;
	totalBytes: number;
	speed: number; // bytes per second
	eta: number; // seconds remaining
}

interface SpeedSample {
	timestamp: number;
	bytes: number;
}

function calculateSpeed(samples: SpeedSample[]): number {
	if (samples.length < 2) return 0;
	const now = performance.now();
	const recent = samples.filter((s) => now - s.timestamp < SPEED_WINDOW_MS);
	if (recent.length < 2) return 0;

	const first = recent[0];
	const last = recent[recent.length - 1];
	const timeDiff = (last.timestamp - first.timestamp) / 1000;
	if (timeDiff === 0) return 0;

	const bytesDiff = last.bytes - first.bytes;
	return bytesDiff / timeDiff;
}

function adaptChunkSize(currentSize: number, speed: number, bufferedAmount: number): number {
	if (bufferedAmount > BUFFER_HIGH_THRESHOLD) {
		return Math.max(MIN_CHUNK_SIZE, Math.floor(currentSize / 2));
	}

	if (speed > 5 * 1024 * 1024 && bufferedAmount < BUFFER_LOW_THRESHOLD) {
		return Math.min(MAX_CHUNK_SIZE, currentSize * 2);
	}

	if (speed > 1024 * 1024 && bufferedAmount < BUFFER_LOW_THRESHOLD) {
		return Math.min(MAX_CHUNK_SIZE, Math.floor(currentSize * 1.5));
	}

	return currentSize;
}

function waitForBufferDrain(channel: RTCDataChannel): Promise<void> {
	return new Promise((resolve) => {
		const check = () => {
			if (channel.bufferedAmount < BUFFER_LOW_THRESHOLD) {
				resolve();
			} else {
				setTimeout(check, BUFFER_CHECK_INTERVAL_MS);
			}
		};
		check();
	});
}

/**
 * Send a single file over the DataChannel.
 */
async function sendFile(
	channel: RTCDataChannel,
	file: File,
	fileIndex: number,
	totalFiles: number,
	totalBytesBeforeThisFile: number,
	totalBytesAll: number,
	onProgress: (progress: TransferProgress) => void
): Promise<void> {
	let chunkSize = INITIAL_CHUNK_SIZE;
	const totalChunks = Math.ceil(file.size / chunkSize);

	// Send metadata
	const metadata: ControlMessage = {
		type: 'metadata',
		name: file.name,
		size: file.size,
		mimeType: file.type || 'application/octet-stream',
		totalChunks,
		chunkSize,
		fileIndex,
		totalFiles
	};
	channel.send(JSON.stringify(metadata));

	let offset = 0;
	let bytesSent = 0;
	const speedSamples: SpeedSample[] = [];

	while (offset < file.size) {
		// Wait if buffer is full
		if (channel.bufferedAmount > BUFFER_HIGH_THRESHOLD) {
			await waitForBufferDrain(channel);
		}

		const end = Math.min(offset + chunkSize, file.size);
		const slice = file.slice(offset, end);
		const buffer = await slice.arrayBuffer();
		channel.send(buffer);

		bytesSent += buffer.byteLength;
		offset = end;

		speedSamples.push({ timestamp: performance.now(), bytes: bytesSent });
		// Keep only recent samples
		const now = performance.now();
		while (speedSamples.length > 0 && now - speedSamples[0].timestamp > SPEED_WINDOW_MS * 2) {
			speedSamples.shift();
		}

		const speed = calculateSpeed(speedSamples);
		const totalSent = totalBytesBeforeThisFile + bytesSent;
		const remaining = totalBytesAll - totalSent;
		const eta = speed > 0 ? remaining / speed : 0;

		// Adapt chunk size based on throughput
		chunkSize = adaptChunkSize(chunkSize, speed, channel.bufferedAmount);

		onProgress({
			currentFile: file.name,
			currentFileIndex: fileIndex,
			totalFiles,
			fileBytesSent: bytesSent,
			fileTotalBytes: file.size,
			totalBytesSent: totalSent,
			totalBytes: totalBytesAll,
			speed,
			eta
		});
	}

	// Send file complete message
	const complete: ControlMessage = {
		type: 'complete',
		fileIndex
	};
	channel.send(JSON.stringify(complete));
}

/**
 * Send multiple files sequentially over the DataChannel.
 */
export async function sendFiles(
	channel: RTCDataChannel,
	files: File[],
	onProgress: (progress: TransferProgress) => void
): Promise<void> {
	const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
	let totalBytesSent = 0;

	for (let i = 0; i < files.length; i++) {
		await sendFile(channel, files[i], i, files.length, totalBytesSent, totalBytes, onProgress);
		totalBytesSent += files[i].size;
	}

	// Signal all files are done
	const allComplete: ControlMessage = { type: 'all-complete' };
	channel.send(JSON.stringify(allComplete));
}

/**
 * Set up receiver to listen for incoming files.
 */
export function receiveFiles(
	channel: RTCDataChannel,
	onMetadata: (meta: FileMetadata) => void,
	onProgress: (progress: TransferProgress) => void,
	onFileComplete: (blob: Blob, meta: FileMetadata) => void,
	onAllComplete: () => void
): void {
	let currentMeta: FileMetadata | null = null;
	let chunks: ArrayBuffer[] = [];
	let received = 0;
	let totalBytesReceived = 0;
	let totalFiles = 0;
	let totalBytes = 0;
	const speedSamples: SpeedSample[] = [];

	channel.binaryType = 'arraybuffer';

	channel.onmessage = (event: MessageEvent) => {
		if (typeof event.data === 'string') {
			const msg = JSON.parse(event.data) as ControlMessage;

			if (msg.type === 'metadata') {
				currentMeta = {
					name: msg.name!,
					size: msg.size!,
					mimeType: msg.mimeType!,
					totalChunks: msg.totalChunks!,
					chunkSize: msg.chunkSize!
				};
				totalFiles = msg.totalFiles ?? 1;
				chunks = [];
				received = 0;
				onMetadata(currentMeta);
			}

			if (msg.type === 'complete' && currentMeta) {
				const blob = new Blob(chunks, { type: currentMeta.mimeType });
				totalBytesReceived += currentMeta.size;
				onFileComplete(blob, currentMeta);
				currentMeta = null;
				chunks = [];
				received = 0;
			}

			if (msg.type === 'all-complete') {
				onAllComplete();
			}
		} else {
			// Binary chunk
			const buffer = event.data as ArrayBuffer;
			chunks.push(buffer);
			received += buffer.byteLength;

			speedSamples.push({ timestamp: performance.now(), bytes: totalBytesReceived + received });
			const now = performance.now();
			while (
				speedSamples.length > 0 &&
				now - speedSamples[0].timestamp > SPEED_WINDOW_MS * 2
			) {
				speedSamples.shift();
			}

			const speed = calculateSpeed(speedSamples);

			if (currentMeta) {
				const currentTotal = totalBytesReceived + received;
				const eta = speed > 0 ? (totalBytes - currentTotal) / speed : 0;

				onProgress({
					currentFile: currentMeta.name,
					currentFileIndex: 0,
					totalFiles,
					fileBytesSent: received,
					fileTotalBytes: currentMeta.size,
					totalBytesSent: currentTotal,
					totalBytes: totalBytes || currentMeta.size,
					speed,
					eta: Math.max(0, eta)
				});
			}
		}
	};
}
