<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { loadPdf, formatFileSize } from '$lib/utils/pdf';
	import type { PDFDocumentProxy } from '$lib/utils/pdf';
	import { createTypedWorker } from '$lib/workers/worker-utils';
	import { FileText, X, Download, FileDown } from '@lucide/svelte';

	type Quality = 'low' | 'medium' | 'high';

	const QUALITY_MAP: Record<Quality, { label: string; jpegQuality: number; description: string }> = {
		low: { label: 'Maximum compression', jpegQuality: 0.4, description: 'Smallest file size, noticeable quality loss (JPEG 40%)' },
		medium: { label: 'Balanced', jpegQuality: 0.6, description: 'Good balance of size and quality (JPEG 60%)' },
		high: { label: 'Minimum compression', jpegQuality: 0.8, description: 'Best visual quality, moderate size reduction (JPEG 80%)' }
	};

	let file = $state<File | null>(null);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let quality = $state<Quality>('medium');
	let compressing = $state(false);
	let errorMsg = $state('');
	let resultUrl = $state('');
	let resultSize = $state(0);
	let originalSize = $state(0);

	let savings = $derived.by(() => {
		if (!originalSize || !resultSize) return null;
		const pct = ((originalSize - resultSize) / originalSize) * 100;
		return { bytes: originalSize - resultSize, percent: pct };
	});

	async function handleFiles(newFiles: File[]): Promise<void> {
		const pdfFile = newFiles.find(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (!pdfFile) return;
		cleanup();
		file = pdfFile;
		originalSize = pdfFile.size;
		try {
			pdf = await loadPdf(pdfFile);
		} catch {
			errorMsg = 'Failed to load PDF';
			file = null;
		}
	}

	async function compress(): Promise<void> {
		if (!file || !pdf) return;
		compressing = true;
		errorMsg = '';
		revokeResult();

		try {
			const totalPages = pdf.numPages;
			const jpegQuality = QUALITY_MAP[quality].jpegQuality;
			const images: { data: ArrayBuffer; width: number; height: number }[] = [];

			for (let i = 1; i <= totalPages; i++) {
				const page = await pdf.getPage(i);
				const viewport = page.getViewport({ scale: 1.5 });

				const canvas = new OffscreenCanvas(viewport.width, viewport.height);
				await page.render({
					canvas: canvas as unknown as HTMLCanvasElement,
					viewport
				}).promise;

				const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: jpegQuality });
				const buf = await blob.arrayBuffer();
				images.push({
					data: buf,
					width: viewport.width,
					height: viewport.height
				});
			}

			const worker = createTypedWorker(
				new Worker(new URL('$lib/workers/pdf.worker.ts', import.meta.url), {
					type: 'module'
				})
			);

			const result = await worker.request('buildFromImages', { images });
			worker.terminate();

			const blob = new Blob([result as BlobPart], { type: 'application/pdf' });
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Compression failed';
		} finally {
			compressing = false;
		}
	}

	function revokeResult(): void {
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = '';
			resultSize = 0;
		}
	}

	function cleanup(): void {
		revokeResult();
		pdf?.destroy();
		pdf = null;
		file = null;
		errorMsg = '';
		originalSize = 0;
	}
</script>

<ToolHeader title="Compress PDF" description="Reduce file size by recompression" />

<div class="space-y-4">
	{#if !file}
		<FileDropzone accept=".pdf" onFiles={handleFiles} />
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="text-muted-foreground size-5" />
				<span class="text-sm font-medium">{file.name}</span>
				<span class="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
			</div>
			<Button variant="ghost" size="icon" onclick={cleanup} aria-label="Remove">
				<X class="size-4" />
			</Button>
		</div>
	{/if}

	{#if pdf}
		<div class="space-y-3">
			<span class="text-sm font-medium">Quality</span>
			<div class="grid gap-2 sm:grid-cols-3">
				{#each Object.entries(QUALITY_MAP) as [key, value] (key)}
					<button
						class="rounded-lg border-2 p-3 text-left transition-colors
							{quality === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}"
						onclick={() => (quality = key as Quality)}
					>
						<p class="text-sm font-medium">{value.label}</p>
						<p class="text-muted-foreground text-xs">{value.description}</p>
					</button>
				{/each}
			</div>
		</div>

		<Button onclick={compress} disabled={compressing}>
			{#if compressing}
				<LoadingSpinner size="sm" />
				<span class="ml-2">Compressing...</span>
			{:else}
				<FileDown class="mr-2 size-4" />
				Compress
			{/if}
		</Button>
	{/if}

	{#if errorMsg}
		<div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
			{errorMsg}
		</div>
	{/if}

	{#if resultUrl}
		<div class="bg-muted/50 space-y-3 rounded-lg p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium">Compressed PDF ready</p>
					<p class="text-muted-foreground text-xs">
						{formatFileSize(originalSize)} → {formatFileSize(resultSize)}
						{#if savings}
							({savings.percent > 0 ? '-' : '+'}{Math.abs(savings.percent).toFixed(1)}%)
						{/if}
					</p>
				</div>
				<Button href={resultUrl} download={file?.name?.replace(/\.pdf$/i, '_compressed.pdf') ?? 'compressed.pdf'}>
					<Download class="mr-2 size-4" />
					Download
				</Button>
			</div>
		</div>
	{/if}
</div>