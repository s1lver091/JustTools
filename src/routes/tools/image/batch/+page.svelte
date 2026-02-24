<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Trash2,
		Download,
		Play,
		Loader2,
		X,
		ImagePlus,
		Archive
	} from '@lucide/svelte';
	import { loadImageBitmap, exportImage, downloadBlob, formatFileSize, detectAvifSupport } from '$lib/utils/image-export';
	import { resizeImage } from '$lib/utils/image-filters';
	import { stripExif } from '$lib/utils/image-exif';
	import { ACCEPTED_IMAGE_TYPES, FORMAT_EXTENSIONS, type ImageFormat } from '$lib/utils/image-types';

	interface BatchFile {
		file: File;
		name: string;
		size: number;
		status: 'pending' | 'processing' | 'done' | 'error';
		resultBlob?: Blob;
		error?: string;
	}

	let files = $state<BatchFile[]>([]);
	let operation = $state<'resize' | 'compress' | 'convert' | 'strip-exif'>('compress');
	let processing = $state(false);
	let progress = $state(0);

	// Resize options
	let resizePercent = $state(50);

	// Compress/Convert options
	let targetFormat = $state<ImageFormat>('image/jpeg');
	let quality = $state(80);
	let avifSupported = $state(false);

	detectAvifSupport().then((supported) => {
		avifSupported = supported;
	});

	function handleFiles(newFiles: File[]): void {
		const batch: BatchFile[] = newFiles.map((f) => ({
			file: f,
			name: f.name,
			size: f.size,
			status: 'pending'
		}));
		files = [...files, ...batch];
	}

	function removeFile(index: number): void {
		files = files.filter((_, i) => i !== index);
	}

	function clearAll(): void {
		files = [];
		progress = 0;
	}

	async function processAll(): Promise<void> {
		processing = true;
		progress = 0;

		for (let i = 0; i < files.length; i++) {
			const entry = files[i];
			if (entry.status === 'done') continue;

			files[i] = { ...entry, status: 'processing' };

			try {
				let bitmap = await loadImageBitmap(entry.file);

				if (operation === 'resize') {
					const w = Math.round(bitmap.width * resizePercent / 100);
					const h = Math.round(bitmap.height * resizePercent / 100);
					const resized = await resizeImage(bitmap, Math.max(1, w), Math.max(1, h));
					bitmap.close();
					bitmap = resized;
				}

				if (operation === 'strip-exif') {
					const blob = await stripExif(entry.file);
					bitmap.close();
					files[i] = { ...files[i], status: 'done', resultBlob: blob };
				} else {
					const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
					const ctx = canvas.getContext('2d')!;
					ctx.drawImage(bitmap, 0, 0);
					bitmap.close();

					const inferredFormat = (entry.file.type === 'image/png' ? 'image/png'
						: entry.file.type === 'image/webp' ? 'image/webp'
						: 'image/jpeg') as ImageFormat;
					const fmt = (operation === 'convert' || operation === 'compress')
						? targetFormat
						: inferredFormat;
					const blob = await exportImage(canvas, fmt, quality / 100);
					files[i] = { ...files[i], status: 'done', resultBlob: blob };
				}
			} catch (err) {
				files[i] = { ...files[i], status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
			}

			progress = Math.round(((i + 1) / files.length) * 100);
		}

		processing = false;
	}

	function getOutputExtension(entry: BatchFile): string {
		if (operation === 'convert' || operation === 'compress') return FORMAT_EXTENSIONS[targetFormat];
		const inferredFmt = (entry.file.type === 'image/png' ? 'image/png'
			: entry.file.type === 'image/webp' ? 'image/webp'
			: 'image/jpeg') as ImageFormat;
		return FORMAT_EXTENSIONS[inferredFmt];
	}

	function downloadSingle(entry: BatchFile): void {
		if (!entry.resultBlob) return;
		const ext = getOutputExtension(entry);
		const baseName = entry.name.replace(/\.[^.]+$/, '');
		downloadBlob(entry.resultBlob, `${baseName}-batch${ext}`);
	}

	async function downloadAllZip(): Promise<void> {
		const { zipSync } = await import('fflate');
		const zipFiles: Record<string, Uint8Array> = {};

		for (const entry of files) {
			if (!entry.resultBlob) continue;
			const ext = getOutputExtension(entry);
			const baseName = entry.name.replace(/\.[^.]+$/, '');
			const name = `${baseName}-batch${ext}`;
			zipFiles[name] = new Uint8Array(await entry.resultBlob.arrayBuffer());
		}

		const zipped = zipSync(zipFiles);
		const blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
		downloadBlob(blob, 'batch-images.zip');
	}

	function resetResults(): void {
		files = files.map((f) => ({
			...f,
			status: 'pending' as const,
			resultBlob: undefined,
			error: undefined
		}));
		progress = 0;
	}

	function changeOperation(op: typeof operation): void {
		operation = op;
		resetResults();
	}

	let doneCount = $derived(files.filter((f) => f.status === 'done').length);
	let errorCount = $derived(files.filter((f) => f.status === 'error').length);
	let hasResults = $derived(doneCount > 0);

	const operations = [
		{ value: 'compress' as const, label: 'Compress' },
		{ value: 'convert' as const, label: 'Convert Format' },
		{ value: 'resize' as const, label: 'Resize' },
		{ value: 'strip-exif' as const, label: 'Remove EXIF' }
	];
</script>

<ToolHeader
	title="Batch Processing"
	description="Apply operations to multiple images at once"
/>

<div class="mx-auto max-w-3xl space-y-6">
	<!-- File input -->
	{#if files.length === 0}
		<FileDropzone accept={ACCEPTED_IMAGE_TYPES} multiple onFiles={handleFiles} />
	{:else}
		<!-- File list -->
		<Card.Root>
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<Card.Title class="text-sm">{files.length} images</Card.Title>
					<div class="flex gap-2">
						<Button variant="ghost" size="sm" onclick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = ACCEPTED_IMAGE_TYPES; input.multiple = true; input.onchange = () => { if (input.files) handleFiles(Array.from(input.files)); }; input.click(); }}>
							<ImagePlus class="mr-1 size-4" /> Add More
						</Button>
						<Button variant="ghost" size="sm" onclick={clearAll}>
							<Trash2 class="mr-1 size-4" /> Clear
						</Button>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="max-h-60 space-y-1 overflow-y-auto">
					{#each files as entry, i (entry.name + i)}
						<div class="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm {entry.status === 'error' ? 'bg-destructive/5' : ''}">
							<span class="flex-1 truncate">{entry.name}</span>
							<span class="text-muted-foreground text-xs">{formatFileSize(entry.size)}</span>
							{#if entry.status === 'processing'}
								<Loader2 class="size-4 animate-spin text-blue-500" />
							{:else if entry.status === 'done'}
								<Badge variant="secondary" class="text-xs">
									{entry.resultBlob ? formatFileSize(entry.resultBlob.size) : ''}
								</Badge>
								<Button variant="ghost" size="icon" class="size-6" onclick={() => downloadSingle(entry)}>
									<Download class="size-3.5" />
								</Button>
							{:else if entry.status === 'error'}
								<Badge variant="destructive" class="text-xs">Error</Badge>
							{/if}
							{#if !processing}
								<Button variant="ghost" size="icon" class="size-6" onclick={() => removeFile(i)}>
									<X class="size-3.5" />
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Operation selection -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="text-sm">Operation</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-wrap gap-2">
					{#each operations as op}
						<Button
							variant={operation === op.value ? 'default' : 'outline'}
							size="sm"
							onclick={() => { changeOperation(op.value); }}
							disabled={processing}
						>
							{op.label}
						</Button>
					{/each}
				</div>

				<Separator />

				{#if operation === 'resize'}
					<div class="space-y-2">
						<Label class="text-xs">Resize to</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								bind:value={resizePercent}
								min={1}
								max={500}
								class="w-24"
								disabled={processing}
							/>
							<span class="text-muted-foreground text-sm">% of original</span>
						</div>
						<div class="flex flex-wrap gap-1">
							{#each [25, 50, 75] as pct}
								<Button variant="outline" size="sm" class="h-7 text-xs" onclick={() => { resizePercent = pct; }} disabled={processing}>
									{pct}%
								</Button>
							{/each}
						</div>
					</div>
				{/if}

				{#if operation === 'compress' || operation === 'convert'}
					<div class="space-y-3">
						<div>
							<Label class="text-muted-foreground text-xs">Common</Label>
							<div class="mt-1 flex flex-wrap gap-2">
								{#each (['image/jpeg', 'image/png', 'image/webp'] as const) as fmt}
									<Button
										variant={targetFormat === fmt ? 'default' : 'outline'}
										size="sm"
										onclick={() => { targetFormat = fmt; }}
										disabled={processing}
									>
										{fmt === 'image/jpeg' ? 'JPEG' : fmt === 'image/png' ? 'PNG' : 'WebP'}
									</Button>
								{/each}
								<Button
									variant={targetFormat === 'image/avif' ? 'default' : 'outline'}
									size="sm"
									onclick={() => { targetFormat = 'image/avif'; }}
									disabled={processing || !avifSupported}
								>
									AVIF
									{#if !avifSupported}
										<span class="text-muted-foreground ml-1 text-xs">(unsupported)</span>
									{/if}
								</Button>
							</div>
						</div>
						<div>
							<Label class="text-muted-foreground text-xs">Other</Label>
							<div class="mt-1 flex flex-wrap gap-2">
								{#each (['image/gif', 'image/bmp', 'image/tiff', 'image/x-icon'] as const) as fmt}
									{@const labels = { 'image/gif': 'GIF', 'image/bmp': 'BMP', 'image/tiff': 'TIFF', 'image/x-icon': 'ICO' } as const}
									<Button
										variant={targetFormat === fmt ? 'default' : 'outline'}
										size="sm"
										onclick={() => { targetFormat = fmt; }}
										disabled={processing}
									>
										{labels[fmt]}
									</Button>
								{/each}
							</div>
						</div>
						<div>
							<Label class="text-muted-foreground text-xs">Document</Label>
							<div class="mt-1 flex flex-wrap gap-2">
								{#each (['application/pdf', 'image/svg+xml'] as const) as fmt}
									<Button
										variant={targetFormat === fmt ? 'default' : 'outline'}
										size="sm"
										onclick={() => { targetFormat = fmt; }}
										disabled={processing}
									>
										{fmt === 'application/pdf' ? 'PDF' : 'SVG'}
									</Button>
								{/each}
							</div>
						</div>
						{#if targetFormat !== 'image/png' && targetFormat !== 'image/bmp' && targetFormat !== 'image/gif' && targetFormat !== 'image/x-icon' && targetFormat !== 'application/pdf' && targetFormat !== 'image/svg+xml'}
							<div class="space-y-1">
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
									disabled={processing}
								/>
							</div>
						{/if}
					</div>
				{/if}

				{#if operation === 'strip-exif'}
					<p class="text-muted-foreground text-sm">
						All metadata will be removed from the images. The clean images are re-encoded
						to strip all EXIF, IPTC, and XMP data.
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Process / Download -->
		<div class="flex items-center gap-3">
			{#if !hasResults}
				<Button class="flex-1" onclick={processAll} disabled={processing || files.length === 0}>
					{#if processing}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Processing {progress}%...
					{:else}
						<Play class="mr-2 size-4" />
						Process All ({files.length})
					{/if}
				</Button>
			{:else}
				<Button class="flex-1" onclick={downloadAllZip}>
					<Archive class="mr-2 size-4" />
					Download All as ZIP ({doneCount} images)
				</Button>
				{#if errorCount > 0}
					<Badge variant="destructive">{errorCount} failed</Badge>
				{/if}
			{/if}
		</div>

		{#if processing}
			<div class="bg-muted h-2 overflow-hidden rounded-full">
				<div
					class="h-full bg-green-500 transition-all"
					style="width: {progress}%;"
				></div>
			</div>
		{/if}
	{/if}
</div>
