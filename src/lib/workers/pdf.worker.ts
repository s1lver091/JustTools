import type { WorkerMessage } from './worker-utils';

interface MergeRequest {
	buffers: ArrayBuffer[];
}

interface SplitRequest {
	buffer: ArrayBuffer;
	ranges: number[][];
}

interface ReorganizeOperation {
	pageIndex: number;
	rotation: number;
	deleted: boolean;
}

interface ReorganizeRequest {
	buffer: ArrayBuffer;
	operations: ReorganizeOperation[];
}

interface CompressedPageImage {
	data: ArrayBuffer;
	width: number;
	height: number;
}

interface BuildFromImagesRequest {
	images: CompressedPageImage[];
}

type PdfWorkerRequest =
	| { type: 'merge'; payload: MergeRequest }
	| { type: 'split'; payload: SplitRequest }
	| { type: 'reorganize'; payload: ReorganizeRequest }
	| { type: 'buildFromImages'; payload: BuildFromImagesRequest };

type PdfWorkerPayload = ArrayBuffer | ArrayBuffer[] | { percent: number };

function sendProgress(percent: number): void {
	self.postMessage({ id: '', type: 'progress', payload: { percent } });
}

async function handleMerge(
	id: string,
	req: MergeRequest
): Promise<WorkerMessage<PdfWorkerPayload>> {
	const { PDFDocument } = await import('pdf-lib');
	const merged = await PDFDocument.create();

	for (let i = 0; i < req.buffers.length; i++) {
		const src = await PDFDocument.load(req.buffers[i]);
		const pages = await merged.copyPages(src, src.getPageIndices());
		for (const page of pages) {
			merged.addPage(page);
		}
		sendProgress(((i + 1) / req.buffers.length) * 100);
	}

	const bytes = await merged.save();
	return { id, type: 'merge', payload: bytes.buffer as ArrayBuffer };
}

async function handleSplit(
	id: string,
	req: SplitRequest
): Promise<WorkerMessage<PdfWorkerPayload>> {
	const { PDFDocument } = await import('pdf-lib');
	const src = await PDFDocument.load(req.buffer);
	const results: ArrayBuffer[] = [];

	for (let i = 0; i < req.ranges.length; i++) {
		const range = req.ranges[i];
		const newDoc = await PDFDocument.create();
		const indices = range.map((p) => p - 1);
		const pages = await newDoc.copyPages(src, indices);
		for (const page of pages) {
			newDoc.addPage(page);
		}
		const bytes = await newDoc.save();
		results.push(bytes.buffer as ArrayBuffer);
		sendProgress(((i + 1) / req.ranges.length) * 100);
	}

	return { id, type: 'split', payload: results };
}

async function handleReorganize(
	id: string,
	req: ReorganizeRequest
): Promise<WorkerMessage<PdfWorkerPayload>> {
	const { PDFDocument, degrees } = await import('pdf-lib');
	const src = await PDFDocument.load(req.buffer);
	const newDoc = await PDFDocument.create();

	const activeOps = req.operations.filter((op) => !op.deleted);
	for (let i = 0; i < activeOps.length; i++) {
		const op = activeOps[i];
		const [page] = await newDoc.copyPages(src, [op.pageIndex]);
		if (op.rotation !== 0) {
			page.setRotation(degrees(op.rotation));
		}
		newDoc.addPage(page);
		sendProgress(((i + 1) / activeOps.length) * 100);
	}

	const bytes = await newDoc.save();
	return { id, type: 'reorganize', payload: bytes.buffer as ArrayBuffer };
}

async function handleBuildFromImages(
	id: string,
	req: BuildFromImagesRequest
): Promise<WorkerMessage<PdfWorkerPayload>> {
	const { PDFDocument } = await import('pdf-lib');
	const doc = await PDFDocument.create();

	for (let i = 0; i < req.images.length; i++) {
		const img = req.images[i];
		const jpgImage = await doc.embedJpg(new Uint8Array(img.data));
		const page = doc.addPage([img.width, img.height]);
		page.drawImage(jpgImage, {
			x: 0,
			y: 0,
			width: img.width,
			height: img.height
		});
		sendProgress(((i + 1) / req.images.length) * 100);
	}

	const bytes = await doc.save();
	return { id, type: 'buildFromImages', payload: bytes.buffer as ArrayBuffer };
}

self.onmessage = async (e: MessageEvent<WorkerMessage<PdfWorkerRequest>>) => {
	const { id, type, payload } = e.data;

	try {
		let response: WorkerMessage<PdfWorkerPayload>;

		switch (type) {
			case 'merge':
				response = await handleMerge(id, payload as unknown as MergeRequest);
				break;
			case 'split':
				response = await handleSplit(id, payload as unknown as SplitRequest);
				break;
			case 'reorganize':
				response = await handleReorganize(id, payload as unknown as ReorganizeRequest);
				break;
			case 'buildFromImages':
				response = await handleBuildFromImages(
					id,
					payload as unknown as BuildFromImagesRequest
				);
				break;
			default:
				throw new Error(`Unknown operation type: ${type}`);
		}

		self.postMessage(response);
	} catch (err) {
		const msg: WorkerMessage<null> = {
			id,
			type: 'error',
			payload: null,
			error: err instanceof Error ? err.message : 'Worker error'
		};
		self.postMessage(msg);
	}
};
