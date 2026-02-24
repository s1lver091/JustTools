import type { AdjustmentState } from './image-types';

export async function rotateImage(
	image: ImageBitmap,
	degrees: 90 | -90 | 180
): Promise<ImageBitmap> {
	const isOrthogonal = degrees === 90 || degrees === -90;
	const canvas = new OffscreenCanvas(
		isOrthogonal ? image.height : image.width,
		isOrthogonal ? image.width : image.height
	);
	const ctx = canvas.getContext('2d')!;
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate((degrees * Math.PI) / 180);
	ctx.drawImage(image, -image.width / 2, -image.height / 2);
	return createImageBitmap(canvas);
}

export async function flipImage(
	image: ImageBitmap,
	direction: 'horizontal' | 'vertical'
): Promise<ImageBitmap> {
	const canvas = new OffscreenCanvas(image.width, image.height);
	const ctx = canvas.getContext('2d')!;
	if (direction === 'horizontal') {
		ctx.translate(image.width, 0);
		ctx.scale(-1, 1);
	} else {
		ctx.translate(0, image.height);
		ctx.scale(1, -1);
	}
	ctx.drawImage(image, 0, 0);
	return createImageBitmap(canvas);
}

export async function resizeImage(
	image: ImageBitmap,
	width: number,
	height: number
): Promise<ImageBitmap> {
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(image, 0, 0, width, height);
	return createImageBitmap(canvas);
}

export async function cropImage(
	image: ImageBitmap,
	x: number,
	y: number,
	width: number,
	height: number
): Promise<ImageBitmap> {
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
	return createImageBitmap(canvas);
}

export function rgbToHex(r: number, g: number, b: number): string {
	return (
		'#' +
		[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
	).toUpperCase();
}

export function rgbToHsl(
	r: number,
	g: number,
	b: number
): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}

	return [
		Math.round(h * 360),
		Math.round(s * 100),
		Math.round(l * 100)
	];
}

export function calculateHistogram(imageData: ImageData): {
	r: number[];
	g: number[];
	b: number[];
} {
	const r = new Array<number>(256).fill(0);
	const g = new Array<number>(256).fill(0);
	const b = new Array<number>(256).fill(0);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		r[data[i]]++;
		g[data[i + 1]]++;
		b[data[i + 2]]++;
	}
	return { r, g, b };
}

export const FILTER_PRESETS: { name: string; adjustments: AdjustmentState }[] = [
	{
		name: 'Original',
		adjustments: { brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0, sharpness: 0 }
	},
	{
		name: 'Vivid',
		adjustments: { brightness: 5, contrast: 15, saturation: 30, exposure: 0, temperature: 0, sharpness: 10 }
	},
	{
		name: 'Warm',
		adjustments: { brightness: 5, contrast: 5, saturation: 10, exposure: 0, temperature: 30, sharpness: 0 }
	},
	{
		name: 'Cool',
		adjustments: { brightness: 0, contrast: 5, saturation: -5, exposure: 0, temperature: -25, sharpness: 0 }
	},
	{
		name: 'B&W',
		adjustments: { brightness: 0, contrast: 10, saturation: -100, exposure: 0, temperature: 0, sharpness: 5 }
	},
	{
		name: 'Vintage',
		adjustments: { brightness: -5, contrast: -10, saturation: -20, exposure: 0, temperature: 15, sharpness: 0 }
	},
	{
		name: 'High Contrast',
		adjustments: { brightness: 0, contrast: 40, saturation: 10, exposure: 0, temperature: 0, sharpness: 15 }
	},
	{
		name: 'Dramatic',
		adjustments: { brightness: -10, contrast: 30, saturation: -10, exposure: -0.3, temperature: -5, sharpness: 20 }
	},
	{
		name: 'Fade',
		adjustments: { brightness: 10, contrast: -15, saturation: -15, exposure: 0.2, temperature: 5, sharpness: 0 }
	},
	{
		name: 'Moody',
		adjustments: { brightness: -15, contrast: 10, saturation: -20, exposure: -0.2, temperature: -10, sharpness: 5 }
	}
];
