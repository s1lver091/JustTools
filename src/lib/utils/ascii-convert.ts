export const CHARACTER_RAMPS = {
	standard: ' .:-=+*#%@',
	block: ' \u2591\u2592\u2593\u2588',
	shade: ' \u2591\u2592\u2593\u2588',
	dense: " .',:;!|\\/)({}<>[]?+~_-^*\"#&%@"
} as const;

export type RampPreset = keyof typeof CHARACTER_RAMPS;

export type AsciiOptions = {
	width: number;
	ramp: string;
	invert: boolean;
};

export function imageDataToAscii(imageData: ImageData, options: AsciiOptions): string {
	const { width: targetWidth, ramp, invert } = options;
	const { data, width, height } = imageData;

	if (ramp.length === 0 || targetWidth <= 0) return '';

	const aspectRatio = height / width;
	const charHeightFactor = 0.5;
	const targetHeight = Math.max(1, Math.round(targetWidth * aspectRatio * charHeightFactor));
	const cellWidth = width / targetWidth;
	const cellHeight = height / targetHeight;
	const lines: string[] = [];

	for (let y = 0; y < targetHeight; y++) {
		let line = '';
		for (let x = 0; x < targetWidth; x++) {
			const px = Math.floor(x * cellWidth);
			const py = Math.floor(y * cellHeight);
			const i = (py * width + px) * 4;
			const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
			const adjusted = invert ? 1 - brightness : brightness;
			const charIndex = Math.min(
				Math.floor(adjusted * (ramp.length - 1)),
				ramp.length - 1
			);
			line += ramp[charIndex];
		}
		lines.push(line);
	}

	return lines.join('\n');
}

export function downloadTxt(text: string, filename: string): void {
	const blob = new Blob([text], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function renderAsciiToPng(text: string): string {
	const lines = text.split('\n');
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	const fontSize = 14;
	const lineHeight = 16;
	const padding = 20;

	ctx.font = `${fontSize}px monospace`;
	const charWidth = ctx.measureText('M').width;
	const maxLineLength = Math.max(...lines.map((l) => l.length));

	canvas.width = Math.ceil(charWidth * maxLineLength) + padding;
	canvas.height = lineHeight * lines.length + padding;

	ctx.fillStyle = '#1e1e1e';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.font = `${fontSize}px monospace`;
	ctx.fillStyle = '#ffffff';

	const halfPad = padding / 2;
	lines.forEach((line, i) => {
		ctx.fillText(line, halfPad, halfPad + lineHeight * (i + 1));
	});

	return canvas.toDataURL('image/png');
}

export function downloadPng(dataUrl: string, filename: string): void {
	const a = document.createElement('a');
	a.href = dataUrl;
	a.download = filename;
	a.click();
}
