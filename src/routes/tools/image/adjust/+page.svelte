<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import {
		RotateCcw,
		Download,
		ImagePlus,
		Sun,
		Contrast,
		Droplets,
		Aperture,
		Thermometer,
		Focus
	} from '@lucide/svelte';
	import { loadImageBitmap, exportImage, downloadBlob, formatFileSize } from '$lib/utils/image-export';
	import { calculateHistogram, FILTER_PRESETS } from '$lib/utils/image-filters';
	import { createWebGLRenderer, type WebGLRenderer } from '$lib/utils/webgl';
	import { ACCEPTED_IMAGE_TYPES, DEFAULT_ADJUSTMENTS, type AdjustmentState } from '$lib/utils/image-types';

	let image = $state<ImageBitmap | null>(null);
	let fileName = $state('');
	let fileSize = $state(0);

	let adjustments = $state<AdjustmentState>({ ...DEFAULT_ADJUSTMENTS });
	let activePreset = $state<string | null>('Original');
	let renderer = $state<WebGLRenderer | null>(null);
	let glCanvas = $state<HTMLCanvasElement | null>(null);
	let noWebGL = $state(false);

	// Histogram
	let histogramData = $state<{ r: number[]; g: number[]; b: number[] } | null>(null);
	let histogramDebounce: ReturnType<typeof setTimeout> | undefined;

	// Filter thumbnails
	let thumbnails = $state<Map<string, string>>(new Map());

	$effect(() => {
		return () => {
			renderer?.destroy();
			image?.close();
			thumbnails.forEach((url) => URL.revokeObjectURL(url));
			clearTimeout(histogramDebounce);
		};
	});

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;
		fileName = file.name;
		fileSize = file.size;
		image = await loadImageBitmap(file);
		adjustments = { ...DEFAULT_ADJUSTMENTS };
		activePreset = 'Original';
		initWebGL();
		generateThumbnails();
	}

	function loadAnother(): void {
		renderer?.destroy();
		renderer = null;
		image?.close();
		image = null;
		thumbnails.forEach((url) => URL.revokeObjectURL(url));
		thumbnails = new Map();
		histogramData = null;
	}

	function initWebGL(): void {
		if (!image || !glCanvas) return;
		renderer?.destroy();
		const r = createWebGLRenderer(glCanvas, image);
		if (r) {
			renderer = r;
			noWebGL = false;
			r.render(adjustments);
			updateHistogram();
		} else {
			noWebGL = true;
		}
	}

	// Re-render when adjustments change
	$effect(() => {
		if (renderer && image) {
			renderer.render(adjustments);
			scheduleHistogramUpdate();
		}
	});

	// Init WebGL when canvas mounts
	$effect(() => {
		if (glCanvas && image && !renderer) {
			initWebGL();
		}
	});

	function scheduleHistogramUpdate(): void {
		clearTimeout(histogramDebounce);
		histogramDebounce = setTimeout(updateHistogram, 200);
	}

	function updateHistogram(): void {
		if (!renderer) return;
		try {
			const imageData = renderer.getImageData();
			// Downsample for performance
			const scale = Math.min(1, 500 / Math.max(imageData.width, imageData.height));
			if (scale < 1) {
				const w = Math.round(imageData.width * scale);
				const h = Math.round(imageData.height * scale);
				const canvas = new OffscreenCanvas(w, h);
				const ctx = canvas.getContext('2d')!;
				ctx.putImageData(imageData, 0, 0);
				const downscaled = ctx.getImageData(0, 0, w, h);
				histogramData = calculateHistogram(downscaled);
			} else {
				histogramData = calculateHistogram(imageData);
			}
		} catch {
			histogramData = null;
		}
	}

	async function generateThumbnails(): Promise<void> {
		if (!image) return;
		// Create a small center-cropped square
		const size = 80;
		const minDim = Math.min(image.width, image.height);
		const sx = (image.width - minDim) / 2;
		const sy = (image.height - minDim) / 2;

		const thumbCanvas = document.createElement('canvas');
		thumbCanvas.width = size;
		thumbCanvas.height = size;

		for (const preset of FILTER_PRESETS) {
			const r = createWebGLRenderer(thumbCanvas, image);
			if (!r) break;
			r.render(preset.adjustments);
			try {
				const blob = await new Promise<Blob | null>((resolve) => {
					thumbCanvas.toBlob(resolve, 'image/jpeg', 0.7);
				});
				if (blob) {
					thumbnails.set(preset.name, URL.createObjectURL(blob));
				}
			} catch {
				// skip thumbnail
			}
			r.destroy();
		}
		thumbnails = new Map(thumbnails);
	}

	function applyPreset(preset: { name: string; adjustments: AdjustmentState }): void {
		adjustments = { ...preset.adjustments };
		activePreset = preset.name;
	}

	function resetAll(): void {
		adjustments = { ...DEFAULT_ADJUSTMENTS };
		activePreset = 'Original';
	}

	function onSliderChange(): void {
		activePreset = null;
	}

	async function handleDownload(): Promise<void> {
		if (!renderer || !image) return;
		// Render full resolution
		const fullCanvas = document.createElement('canvas');
		const fullRenderer = createWebGLRenderer(fullCanvas, image);
		if (!fullRenderer) return;
		fullRenderer.render(adjustments);
		const blob = await exportImage(fullCanvas, 'image/jpeg', 0.92);
		const baseName = fileName.replace(/\.[^.]+$/, '') || 'adjusted';
		downloadBlob(blob, `${baseName}-adjusted.jpg`);
		fullRenderer.destroy();
	}

	// Histogram SVG generation
	function buildHistogramPath(data: number[], width: number, height: number): string {
		if (data.length === 0) return '';
		const max = Math.max(...data, 1);
		const step = width / 255;
		let d = `M 0 ${height}`;
		for (let i = 0; i < 256; i++) {
			const x = i * step;
			const y = height - (data[i] / max) * height;
			d += ` L ${x} ${y}`;
		}
		d += ` L ${width} ${height} Z`;
		return d;
	}

	const sliders: { key: keyof AdjustmentState; label: string; icon: typeof Sun; min: number; max: number; step: number }[] = [
		{ key: 'brightness', label: 'Brightness', icon: Sun, min: -100, max: 100, step: 1 },
		{ key: 'contrast', label: 'Contrast', icon: Contrast, min: -100, max: 100, step: 1 },
		{ key: 'saturation', label: 'Saturation', icon: Droplets, min: -100, max: 100, step: 1 },
		{ key: 'exposure', label: 'Exposure', icon: Aperture, min: -2, max: 2, step: 0.1 },
		{ key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100, step: 1 },
		{ key: 'sharpness', label: 'Sharpness', icon: Focus, min: 0, max: 100, step: 1 }
	];
</script>

<ToolHeader
	title="Adjustments & Filters"
	description="Real-time brightness, contrast, saturation, and filter presets"
/>

{#if !image}
	<FileDropzone accept={ACCEPTED_IMAGE_TYPES} onFiles={handleFiles} />
{:else}
	<div class="flex gap-4" style="height: calc(100vh - 220px); min-height: 400px;">
		<!-- Canvas preview -->
		<div class="relative flex-1 overflow-auto rounded-lg border">
			<div class="flex h-full items-center justify-center bg-black/5 p-4">
				<canvas
					bind:this={glCanvas}
					class="max-h-full max-w-full object-contain"
					style="image-rendering: auto;"
				></canvas>
			</div>
			{#if noWebGL}
				<div class="bg-destructive/10 text-destructive absolute inset-0 flex items-center justify-center">
					WebGL not available. Using software rendering (may be slower).
				</div>
			{/if}
		</div>

		<!-- Controls panel -->
		<div class="w-80 shrink-0 space-y-4 overflow-y-auto">
			<!-- Actions -->
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={resetAll}>
					<RotateCcw class="mr-1 size-4" /> Reset
				</Button>
				<div class="flex-1"></div>
				<Button variant="ghost" size="sm" onclick={loadAnother}>
					<ImagePlus class="mr-1 size-4" /> New
				</Button>
			</div>

			<!-- Filter presets -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-sm">Filter Presets</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="flex gap-2 overflow-x-auto pb-2">
						{#each FILTER_PRESETS as preset (preset.name)}
							<button
								class="shrink-0 text-center"
								onclick={() => applyPreset(preset)}
							>
								<div
									class="size-16 overflow-hidden rounded-lg border-2 transition-colors {activePreset === preset.name ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}"
								>
									{#if thumbnails.has(preset.name)}
										<img
											src={thumbnails.get(preset.name)}
											alt={preset.name}
											class="size-full object-cover"
										/>
									{:else}
										<div class="bg-muted flex size-full items-center justify-center text-xs">
											{preset.name.charAt(0)}
										</div>
									{/if}
								</div>
								<span class="mt-1 block text-xs {activePreset === preset.name ? 'font-medium' : 'text-muted-foreground'}">
									{preset.name}
								</span>
							</button>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Adjustment sliders -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-sm">Adjustments</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each sliders as slider (slider.key)}
						{@const Icon = slider.icon}
						<div class="space-y-1">
							<div class="flex items-center justify-between">
								<Label class="flex items-center gap-1.5 text-xs">
									<Icon class="size-3.5" />
									{slider.label}
								</Label>
								<span class="text-muted-foreground w-12 text-right text-xs font-mono">
									{adjustments[slider.key]}
								</span>
							</div>
							<input
								type="range"
								min={slider.min}
								max={slider.max}
								step={slider.step}
								bind:value={adjustments[slider.key]}
								oninput={onSliderChange}
								class="w-full accent-green-500"
							/>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Histogram -->
			{#if histogramData}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="text-sm">Histogram</Card.Title>
					</Card.Header>
					<Card.Content class="pb-4">
						<svg viewBox="0 0 256 102" class="block h-24 w-full" preserveAspectRatio="none" overflow="visible">
							<path
								d={buildHistogramPath(histogramData.r, 256, 100)}
								fill="rgba(239, 68, 68, 0.4)"
							/>
							<path
								d={buildHistogramPath(histogramData.g, 256, 100)}
								fill="rgba(34, 197, 94, 0.4)"
							/>
							<path
								d={buildHistogramPath(histogramData.b, 256, 100)}
								fill="rgba(59, 130, 246, 0.4)"
							/>
						</svg>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Download -->
			<Button class="w-full" onclick={handleDownload}>
				<Download class="mr-2 size-4" /> Download Adjusted Image
			</Button>

			<!-- Image info -->
			<div class="text-muted-foreground space-y-1 text-xs">
				<div>File: {fileName}</div>
				<div>Size: {formatFileSize(fileSize)}</div>
				<div>Dimensions: {image.width} x {image.height}</div>
			</div>
		</div>
	</div>
{/if}
