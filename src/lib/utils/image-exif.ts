export interface ExifData {
	camera?: { make?: string; model?: string };
	settings?: {
		iso?: number;
		aperture?: number;
		shutterSpeed?: string;
		focalLength?: number;
	};
	gps?: { latitude?: number; longitude?: number; altitude?: number };
	date?: { taken?: Date; modified?: Date };
	software?: string;
	dimensions?: { width: number; height: number };
	raw: Record<string, unknown>;
}

export async function readExif(file: File): Promise<ExifData | null> {
	try {
		const exifr = await import('exifr');
		const raw = await exifr.default.parse(file);
		if (!raw) return null;

		const shutterSpeed = raw.ExposureTime
			? raw.ExposureTime < 1
				? `1/${Math.round(1 / raw.ExposureTime)}`
				: `${raw.ExposureTime}s`
			: undefined;

		return {
			camera: { make: raw.Make, model: raw.Model },
			settings: {
				iso: raw.ISO,
				aperture: raw.FNumber,
				shutterSpeed,
				focalLength: raw.FocalLength
			},
			gps: raw.latitude
				? {
						latitude: raw.latitude,
						longitude: raw.longitude,
						altitude: raw.GPSAltitude
					}
				: undefined,
			date: {
				taken: raw.DateTimeOriginal,
				modified: raw.ModifyDate
			},
			software: raw.Software,
			dimensions: raw.ImageWidth
				? { width: raw.ImageWidth, height: raw.ImageHeight }
				: undefined,
			raw
		};
	} catch {
		return null;
	}
}

export async function stripExif(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();

	// Get raw pixel data and create a clean ImageData to discard all metadata
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const cleanCanvas = new OffscreenCanvas(canvas.width, canvas.height);
	const cleanCtx = cleanCanvas.getContext('2d')!;
	cleanCtx.putImageData(imageData, 0, 0);

	const mime = file.type || 'image/jpeg';
	const isPng = mime === 'image/png';
	return cleanCanvas.convertToBlob({ type: mime, quality: isPng ? undefined : 0.95 });
}
