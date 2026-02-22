import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.mjs',
	import.meta.url
).toString();

const PDF_LOAD_OPTIONS = {
	cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/cmaps/',
	cMapPacked: true
};

export async function loadPdf(source: File | ArrayBuffer): Promise<PDFDocumentProxy> {
	const data = source instanceof File ? await source.arrayBuffer() : source;
	const doc = await getDocument({ data, ...PDF_LOAD_OPTIONS }).promise;
	return doc;
}

export async function renderPage(
	page: PDFPageProxy,
	canvas: HTMLCanvasElement,
	scale: number
): Promise<RenderTask> {
	const viewport = page.getViewport({ scale: scale * window.devicePixelRatio });
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	canvas.style.width = `${viewport.width / window.devicePixelRatio}px`;
	canvas.style.height = `${viewport.height / window.devicePixelRatio}px`;

	const context = canvas.getContext('2d');
	if (!context) throw new Error('Cannot get 2d context from canvas');

	const renderTask = page.render({ canvas, viewport });
	await renderTask.promise;
	return renderTask;
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);
	return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export interface ParsedRanges {
	valid: boolean;
	ranges: number[][];
	error: string;
}

export function parseRanges(input: string, totalPages: number): ParsedRanges {
	const trimmed = input.trim();
	if (!trimmed) return { valid: false, ranges: [], error: 'Enter at least one range' };

	const parts = trimmed.split(',').map((s) => s.trim());
	const ranges: number[][] = [];
	const seenPages = new Set<number>();

	for (const part of parts) {
		if (!part) continue;

		const dashMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
		if (dashMatch) {
			const start = parseInt(dashMatch[1], 10);
			const end = parseInt(dashMatch[2], 10);

			if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
				return { valid: false, ranges: [], error: `Page out of range: ${part}` };
			}
			if (start > end) {
				return { valid: false, ranges: [], error: `Invalid range: ${part}` };
			}

			const pages: number[] = [];
			for (let i = start; i <= end; i++) {
				if (seenPages.has(i)) {
					return { valid: false, ranges: [], error: `Duplicate page: ${i}` };
				}
				seenPages.add(i);
				pages.push(i);
			}
			ranges.push(pages);
			continue;
		}

		const num = parseInt(part, 10);
		if (isNaN(num) || num.toString() !== part) {
			return { valid: false, ranges: [], error: `Invalid format: ${part}` };
		}
		if (num < 1 || num > totalPages) {
			return { valid: false, ranges: [], error: `Page out of range: ${num}` };
		}
		if (seenPages.has(num)) {
			return { valid: false, ranges: [], error: `Duplicate page: ${num}` };
		}
		seenPages.add(num);
		ranges.push([num]);
	}

	if (ranges.length === 0) {
		return { valid: false, ranges: [], error: 'Enter at least one range' };
	}

	return { valid: true, ranges, error: '' };
}

export type { PDFDocumentProxy, PDFPageProxy };
