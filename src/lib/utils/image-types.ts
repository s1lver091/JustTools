export interface AdjustmentState {
	brightness: number;
	contrast: number;
	saturation: number;
	exposure: number;
	temperature: number;
	sharpness: number;
}

export const DEFAULT_ADJUSTMENTS: AdjustmentState = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	exposure: 0,
	temperature: 0,
	sharpness: 0
};

export type ImageFormat =
	| 'image/jpeg'
	| 'image/png'
	| 'image/webp'
	| 'image/avif'
	| 'image/bmp'
	| 'image/gif'
	| 'image/tiff'
	| 'image/x-icon'
	| 'application/pdf'
	| 'image/svg+xml';

export const FORMAT_EXTENSIONS: Record<ImageFormat, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/avif': '.avif',
	'image/bmp': '.bmp',
	'image/gif': '.gif',
	'image/tiff': '.tiff',
	'image/x-icon': '.ico',
	'application/pdf': '.pdf',
	'image/svg+xml': '.svg'
};

export const ACCEPTED_IMAGE_TYPES =
	'.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp,image/*';

export const MAX_IMAGE_DIMENSION = 10000;
export const MIN_IMAGE_DIMENSION = 1;

export interface CropRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ImageInfo {
	width: number;
	height: number;
	fileSize: number;
	format: string;
	fileName: string;
}
