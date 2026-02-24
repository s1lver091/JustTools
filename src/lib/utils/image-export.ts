import type { ImageFormat } from './image-types';

const CANVAS_FORMATS = new Set<string>([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif',
	'image/bmp',
	'image/gif',
	'image/tiff',
	'image/x-icon'
]);

export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
	return createImageBitmap(file);
}

export async function exportImage(
	source: HTMLCanvasElement | OffscreenCanvas,
	format: ImageFormat,
	quality: number
): Promise<Blob> {
	if (format === 'application/pdf') {
		return exportAsPdf(source);
	}
	if (format === 'image/svg+xml') {
		return exportAsSvg(source);
	}
	if (source instanceof OffscreenCanvas) {
		return source.convertToBlob({ type: format, quality });
	}
	return new Promise((resolve, reject) => {
		source.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error('Failed to export image'));
			},
			format,
			quality
		);
	});
}

async function exportAsPdf(source: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
	const { PDFDocument } = await import('pdf-lib');
	const pdfDoc = await PDFDocument.create();

	const pngBlob = source instanceof OffscreenCanvas
		? await source.convertToBlob({ type: 'image/png' })
		: await new Promise<Blob>((resolve, reject) => {
				source.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
			});

	const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
	const pngImage = await pdfDoc.embedPng(pngBytes);

	const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
	page.drawImage(pngImage, { x: 0, y: 0, width: pngImage.width, height: pngImage.height });

	const pdfBytes = await pdfDoc.save();
	return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

function exportAsSvg(source: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
	const canvas = source instanceof OffscreenCanvas
		? transferToOnscreen(source)
		: source;
	const dataUrl = canvas.toDataURL('image/png');
	const w = source.width;
	const h = source.height;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image href="${dataUrl}" width="${w}" height="${h}"/>
</svg>`;
	return Promise.resolve(new Blob([svg], { type: 'image/svg+xml' }));
}

function transferToOnscreen(offscreen: OffscreenCanvas): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = offscreen.width;
	c.height = offscreen.height;
	const ctx = c.getContext('2d')!;
	ctx.drawImage(offscreen, 0, 0);
	return c;
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export async function estimateFileSize(
	source: HTMLCanvasElement | OffscreenCanvas,
	format: ImageFormat,
	quality: number
): Promise<number> {
	const blob = await exportImage(source, format, quality);
	return blob.size;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function detectAvifSupport(): Promise<boolean> {
	try {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, 'image/avif', 0.5);
		});
		return blob !== null && blob.type === 'image/avif';
	} catch {
		return false;
	}
}

export function getFormatFromMimeType(mime: string): string {
	const map: Record<string, string> = {
		'image/jpeg': 'JPEG',
		'image/png': 'PNG',
		'image/webp': 'WebP',
		'image/avif': 'AVIF',
		'image/gif': 'GIF',
		'image/bmp': 'BMP'
	};
	return map[mime] ?? mime;
}
