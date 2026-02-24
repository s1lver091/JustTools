<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Download, ImagePlus, Loader2 } from '@lucide/svelte';
	import {
		loadImageBitmap,
		exportImage,
		downloadBlob,
		formatFileSize,
		detectAvifSupport,
		getFormatFromMimeType
	} from '$lib/utils/image-export';
	import {
		ACCEPTED_IMAGE_TYPES,
		FORMAT_EXTENSIONS,
		type ImageFormat
	} from '$lib/utils/image-types';

	interface FormatOption {
		value: ImageFormat;
		label: string;
		lossy: boolean;
		group: 'common' | 'special' | 'document';
		requiresCheck?: boolean;
	}

	let image = $state<ImageBitmap | null>(null);
	let fileName = $state('');
	let originalSize = $state(0);
	let originalFormat = $state('');

	let targetFormat = $state<ImageFormat>('image/jpeg');
	let quality = $state(85);
	let useJpegExtension = $state(false);
	let estimatedSize = $state<number | null>(null);
	let estimating = $state(false);
	let avifSupported = $state(false);
	let outputFileName = $state('');
	let exporting = $state(false);

	let estimateTimer: ReturnType<typeof setTimeout> | undefined;

	detectAvifSupport().then((supported) => {
		avifSupported = supported;
	});

	$effect(() => {
		return () => {
			image?.close();
			clearTimeout(estimateTimer);
		};
	});

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;
		fileName = file.name;
		originalSize = file.size;
		originalFormat = getFormatFromMimeType(file.type);
		outputFileName = file.name.replace(/\.[^.]+$/, '');
		image = await loadImageBitmap(file);
		scheduleEstimate();
	}

	function loadAnother(): void {
		image?.close();
		image = null;
		estimatedSize = null;
	}

	function scheduleEstimate(): void {
		clearTimeout(estimateTimer);
		estimateTimer = setTimeout(estimate, 300);
	}

	async function estimate(): Promise<void> {
		if (!image) return;
		estimating = true;

		const maxDim = 500;
		const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
		const w = Math.round(image.width * scale);
		const h = Math.round(image.height * scale);
		const canvas = new OffscreenCanvas(w, h);
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(image, 0, 0, w, h);

		try {
			const blob = await exportImage(canvas, targetFormat, quality / 100);
			const scaleFactor = (image.width * image.height) / (w * h);
			estimatedSize = Math.round(blob.size * scaleFactor);
		} catch {
			estimatedSize = null;
		}
		estimating = false;
	}

	$effect(() => {
		targetFormat;
		quality;
		if (image) scheduleEstimate();
	});

	let outputExtension = $derived.by(() => {
		if (targetFormat === 'image/jpeg' && useJpegExtension) return '.jpeg';
		return FORMAT_EXTENSIONS[targetFormat];
	});

	async function handleExport(): Promise<void> {
		if (!image) return;
		exporting = true;
		try {
			const canvas = new OffscreenCanvas(image.width, image.height);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(image, 0, 0);
			const blob = await exportImage(canvas, targetFormat, quality / 100);
			downloadBlob(blob, `${outputFileName || 'image'}${outputExtension}`);
		} finally {
			exporting = false;
		}
	}

	let hasQualitySlider = $derived(
		targetFormat !== 'image/png' &&
		targetFormat !== 'image/bmp' &&
		targetFormat !== 'image/gif' &&
		targetFormat !== 'image/x-icon' &&
		targetFormat !== 'application/pdf' &&
		targetFormat !== 'image/svg+xml'
	);

	let savings = $derived.by(() => {
		if (!estimatedSize || !originalSize) return null;
		return Math.round((1 - estimatedSize / originalSize) * 100);
	});

	let previewCanvasRef = $state<HTMLCanvasElement | null>(null);

	$effect(() => {
		if (!previewCanvasRef || !image) return;
		const ctx = previewCanvasRef.getContext('2d');
		if (!ctx) return;
		const scale = Math.min(96 / image.width, 96 / image.height, 1);
		previewCanvasRef.width = Math.round(image.width * scale);
		previewCanvasRef.height = Math.round(image.height * scale);
		ctx.drawImage(image, 0, 0, previewCanvasRef.width, previewCanvasRef.height);
	});

	const formats: FormatOption[] = [
		{ value: 'image/jpeg', label: 'JPEG', lossy: true, group: 'common' },
		{ value: 'image/png', label: 'PNG', lossy: false, group: 'common' },
		{ value: 'image/webp', label: 'WebP', lossy: true, group: 'common' },
		{ value: 'image/avif', label: 'AVIF', lossy: true, group: 'common', requiresCheck: true },
		{ value: 'image/gif', label: 'GIF', lossy: false, group: 'special' },
		{ value: 'image/bmp', label: 'BMP', lossy: false, group: 'special' },
		{ value: 'image/tiff', label: 'TIFF', lossy: false, group: 'special' },
		{ value: 'image/x-icon', label: 'ICO', lossy: false, group: 'special' },
		{ value: 'application/pdf', label: 'PDF', lossy: false, group: 'document' },
		{ value: 'image/svg+xml', label: 'SVG', lossy: false, group: 'document' }
	];

	let commonFormats = $derived(formats.filter((f) => f.group === 'common'));
	let specialFormats = $derived(formats.filter((f) => f.group === 'special'));
	let documentFormats = $derived(formats.filter((f) => f.group === 'document'));
</script>

<ToolHeader
	title="Convert & Export"
	description="Change format and compress images with quality control"
/>

{#if !image}
	<FileDropzone accept={ACCEPTED_IMAGE_TYPES} onFiles={handleFiles} />
{:else}
	<div class="mx-auto max-w-2xl space-y-6">
		<!-- Preview -->
		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg">
					<canvas
						bind:this={previewCanvasRef}
						class="max-h-full max-w-full object-contain"
					></canvas>
				</div>
				<div class="flex-1">
					<p class="font-medium">{fileName}</p>
					<p class="text-muted-foreground text-sm">
						{image.width} x {image.height} - {originalFormat} - {formatFileSize(originalSize)}
					</p>
				</div>
				<Button variant="ghost" size="sm" onclick={loadAnother}>
					<ImagePlus class="mr-1 size-4" /> New
				</Button>
			</Card.Content>
		</Card.Root>

		<!-- Format selection -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">Output Format</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-3">
					<Label class="text-muted-foreground text-xs">Common</Label>
					<div class="flex flex-wrap gap-2">
						{#each commonFormats as fmt}
							{@const disabled = fmt.requiresCheck && !avifSupported}
							<Button
								variant={targetFormat === fmt.value ? 'default' : 'outline'}
								size="sm"
								{disabled}
								onclick={() => { targetFormat = fmt.value; }}
							>
								{fmt.label}
								{#if disabled}
									<span class="text-muted-foreground ml-1 text-xs">(unsupported)</span>
								{/if}
							</Button>
						{/each}
					</div>
					<Label class="text-muted-foreground text-xs">Other</Label>
					<div class="flex flex-wrap gap-2">
						{#each specialFormats as fmt}
							<Button
								variant={targetFormat === fmt.value ? 'default' : 'outline'}
								size="sm"
								onclick={() => { targetFormat = fmt.value; }}
							>
								{fmt.label}
							</Button>
						{/each}
					</div>
					<Label class="text-muted-foreground text-xs">Document</Label>
					<div class="flex flex-wrap gap-2">
						{#each documentFormats as fmt}
							<Button
								variant={targetFormat === fmt.value ? 'default' : 'outline'}
								size="sm"
								onclick={() => { targetFormat = fmt.value; }}
							>
								{fmt.label}
							</Button>
						{/each}
					</div>
				</div>

				{#if targetFormat === 'image/jpeg'}
					<div class="flex items-center gap-2">
						<Label class="text-xs">Extension:</Label>
						<Button
							variant={!useJpegExtension ? 'default' : 'outline'}
							size="sm"
							class="h-7 text-xs"
							onclick={() => { useJpegExtension = false; }}
						>
							.jpg
						</Button>
						<Button
							variant={useJpegExtension ? 'default' : 'outline'}
							size="sm"
							class="h-7 text-xs"
							onclick={() => { useJpegExtension = true; }}
						>
							.jpeg
						</Button>
					</div>
				{/if}

				{#if hasQualitySlider}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label class="text-xs">Quality</Label>
							<span class="text-muted-foreground text-xs">{quality}%</span>
						</div>
						<input
							type="range"
							min="1"
							max="100"
							bind:value={quality}
							class="w-full accent-green-500"
						/>
					</div>
				{/if}

				<Separator />

				<!-- Size estimate -->
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Estimated size:</span>
					<span class="font-medium">
						{#if estimating}
							<Loader2 class="inline size-4 animate-spin" />
						{:else if estimatedSize !== null}
							{formatFileSize(estimatedSize)}
							{#if savings !== null && savings > 0}
								<span class="ml-1 text-green-500">({savings}% smaller)</span>
							{:else if savings !== null && savings < 0}
								<span class="text-destructive ml-1">({Math.abs(savings)}% larger)</span>
							{/if}
						{:else}
							--
						{/if}
					</span>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- File name & download -->
		<Card.Root>
			<Card.Content class="space-y-4 pt-6">
				<div>
					<Label class="text-xs">File name</Label>
					<div class="flex gap-2">
						<Input bind:value={outputFileName} class="flex-1" />
						<span class="text-muted-foreground flex items-center text-sm">
							{outputExtension}
						</span>
					</div>
				</div>
				<Button class="w-full" onclick={handleExport} disabled={exporting}>
					{#if exporting}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Exporting...
					{:else}
						<Download class="mr-2 size-4" />
						Download
					{/if}
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
