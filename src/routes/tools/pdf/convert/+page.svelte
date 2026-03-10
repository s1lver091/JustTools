<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import { loadPdf, formatFileSize } from '$lib/utils/pdf';
	import { downloadBlob, downloadText as downloadTextUtil } from '$lib/utils/download';
	import type { PDFDocumentProxy } from '$lib/utils/pdf';
	import {
		FileText,
		X,
		Download,
		FileImage,
		Plus,
		GripVertical,
		Copy
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	// PDF to Images state
	let pdfFile = $state<File | null>(null);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let totalPages = $state(0);
	let imageFormat = $state<'png' | 'jpeg'>('png');
	let dpi = $state<72 | 150 | 300>(150);
	let jpegQuality = $state(0.9);
	let converting = $state(false);
	let imageResults = $state<Array<{ url: string; size: number; label: string }>>([]);
	let errorMsg = $state('');

	// Images to PDF state
	let imageFiles = $state<File[]>([]);
	let pageSize = $state<'fit' | 'a4' | 'letter'>('fit');
	let margin = $state(0);
	let buildingPdf = $state(false);
	let pdfResultUrl = $state('');
	let pdfResultSize = $state(0);
	let imgDragFrom = $state<number | null>(null);
	let imgDragOver = $state<number | null>(null);

	// Extract Text state
	let textPdfFile = $state<File | null>(null);
	let textPdf = $state<PDFDocumentProxy | null>(null);
	let textTotalPages = $state(0);
	let extracting = $state(false);
	let extractedText = $state('');
	let preserveLayout = $state(false);

	const dpiScale = $derived(dpi / 72);

	// PDF to Images
	async function handlePdfFiles(files: File[]): Promise<void> {
		const f = files.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!f) return;
		cleanupPdfToImages();
		pdfFile = f;
		try {
			pdf = await loadPdf(f);
			totalPages = pdf.numPages;
		} catch {
			errorMsg = 'Failed to load PDF';
			pdfFile = null;
		}
	}

	async function convertToImages(): Promise<void> {
		if (!pdf || !pdfFile) return;
		converting = true;
		errorMsg = '';
		revokeImageResults();

		try {
			const results: typeof imageResults = [];
			for (let i = 1; i <= totalPages; i++) {
				const page = await pdf.getPage(i);
				const viewport = page.getViewport({ scale: dpiScale });
				const canvas = new OffscreenCanvas(viewport.width, viewport.height);
				await page.render({
					canvas: canvas as unknown as HTMLCanvasElement,
					viewport
				}).promise;

				const mimeType = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
				const quality = imageFormat === 'jpeg' ? jpegQuality : undefined;
				const blob = await canvas.convertToBlob({ type: mimeType, quality });
				const url = URL.createObjectURL(blob);
				results.push({
					url,
					size: blob.size,
					label: `Page ${i}`
				});
			}
			imageResults = results;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Conversion failed';
		} finally {
			converting = false;
		}
	}

	async function downloadImagesAsZip(): Promise<void> {
		if (imageResults.length === 0) return;
		const { zipSync } = await import('fflate');
		const ext = imageFormat === 'png' ? 'png' : 'jpg';

		const zipData: Record<string, Uint8Array> = {};
		for (let i = 0; i < imageResults.length; i++) {
			const resp = await fetch(imageResults[i].url);
			const buf = await resp.arrayBuffer();
			zipData[`page_${i + 1}.${ext}`] = new Uint8Array(buf);
		}

		const zipped = zipSync(zipData);
		const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
		downloadBlob(blob, 'pdf_images.zip');
	}

	function revokeImageResults(): void {
		for (const r of imageResults) URL.revokeObjectURL(r.url);
		imageResults = [];
	}

	function cleanupPdfToImages(): void {
		revokeImageResults();
		pdf?.destroy();
		pdf = null;
		pdfFile = null;
		errorMsg = '';
	}

	// Images to PDF
	function handleImageFiles(files: File[]): void {
		const images = files.filter((f) => f.type.startsWith('image/'));
		imageFiles = [...imageFiles, ...images];
	}

	function removeImage(index: number): void {
		imageFiles = imageFiles.filter((_, i) => i !== index);
	}

	function handleImgDragStart(index: number, e: DragEvent): void {
		imgDragFrom = index;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleImgDragOver(index: number, e: DragEvent): void {
		e.preventDefault();
		imgDragOver = index;
	}

	function handleImgDrop(index: number, e: DragEvent): void {
		e.preventDefault();
		if (imgDragFrom === null || imgDragFrom === index) {
			imgDragFrom = null;
			imgDragOver = null;
			return;
		}
		const newFiles = [...imageFiles];
		const [moved] = newFiles.splice(imgDragFrom, 1);
		newFiles.splice(index, 0, moved);
		imageFiles = newFiles;
		imgDragFrom = null;
		imgDragOver = null;
	}

	function handleImgDragEnd(): void {
		imgDragFrom = null;
		imgDragOver = null;
	}

	async function buildPdf(): Promise<void> {
		if (imageFiles.length === 0) return;
		buildingPdf = true;
		errorMsg = '';
		revokePdfResult();

		try {
			const { PDFDocument } = await import('pdf-lib');
			const doc = await PDFDocument.create();

			const PAGE_SIZES = {
				a4: { width: 595.28, height: 841.89 },
				letter: { width: 612, height: 792 }
			};

			for (const imgFile of imageFiles) {
				const buf = await imgFile.arrayBuffer();
				const bytes = new Uint8Array(buf);

				let image;
				if (imgFile.type === 'image/png') {
					image = await doc.embedPng(bytes);
				} else {
					image = await doc.embedJpg(bytes);
				}

				let pageWidth: number;
				let pageHeight: number;

				if (pageSize === 'fit') {
					pageWidth = image.width + margin * 2;
					pageHeight = image.height + margin * 2;
				} else {
					const size = PAGE_SIZES[pageSize];
					pageWidth = size.width;
					pageHeight = size.height;
				}

				const page = doc.addPage([pageWidth, pageHeight]);
				const availW = pageWidth - margin * 2;
				const availH = pageHeight - margin * 2;

				let drawW = image.width;
				let drawH = image.height;
				if (pageSize !== 'fit') {
					const scale = Math.min(availW / image.width, availH / image.height);
					drawW = image.width * scale;
					drawH = image.height * scale;
				}

				const x = margin + (availW - drawW) / 2;
				const y = margin + (availH - drawH) / 2;
				page.drawImage(image, { x, y, width: drawW, height: drawH });
			}

			const savedBytes = await doc.save();
			const blob = new Blob([savedBytes as BlobPart], { type: 'application/pdf' });
			pdfResultUrl = URL.createObjectURL(blob);
			pdfResultSize = blob.size;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Build failed';
		} finally {
			buildingPdf = false;
		}
	}

	function revokePdfResult(): void {
		if (pdfResultUrl) {
			URL.revokeObjectURL(pdfResultUrl);
			pdfResultUrl = '';
			pdfResultSize = 0;
		}
	}

	// Extract Text
	async function handleTextPdfFiles(files: File[]): Promise<void> {
		const f = files.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!f) return;
		cleanupTextExtract();
		textPdfFile = f;
		try {
			textPdf = await loadPdf(f);
			textTotalPages = textPdf.numPages;
		} catch {
			errorMsg = 'Failed to load PDF';
			textPdfFile = null;
		}
	}

	async function extractText(): Promise<void> {
		if (!textPdf) return;
		extracting = true;
		errorMsg = '';
		extractedText = '';

		try {
			const parts: string[] = [];
			for (let i = 1; i <= textTotalPages; i++) {
				const page = await textPdf.getPage(i);
				const content = await page.getTextContent();

				if (preserveLayout) {
					let lastY = -1;
					let line = '';
					for (const item of content.items) {
						if (!('str' in item)) continue;
						const y = Math.round(item.transform[5]);
						if (lastY !== -1 && Math.abs(y - lastY) > 3) {
							parts.push(line);
							line = '';
						}
						if (line && Math.abs(y - lastY) <= 3) {
							const gap = item.transform[4] - (line.length * 5);
							if (gap > 10) line += '  ';
						}
						line += item.str;
						lastY = y;
					}
					if (line) parts.push(line);
				} else {
					const text = content.items
						.filter((item): item is typeof item & { str: string } => 'str' in item)
						.map((item) => item.str)
						.join(' ');
					parts.push(text);
				}

				if (i < textTotalPages) parts.push('\n--- Page Break ---\n');
			}
			extractedText = parts.join('\n');
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Extract failed';
		} finally {
			extracting = false;
		}
	}

	async function copyToClipboard(): Promise<void> {
		await navigator.clipboard.writeText(extractedText);
		toast('Copied!');
	}

	function downloadText(): void {
		downloadTextUtil(extractedText, textPdfFile?.name?.replace(/\.pdf$/i, '.txt') ?? 'extracted.txt');
	}

	function cleanupTextExtract(): void {
		textPdf?.destroy();
		textPdf = null;
		textPdfFile = null;
		extractedText = '';
		errorMsg = '';
	}
</script>

<ToolHeader title="Convert PDF" description="Convert between PDF and images, or extract text" />

<Tabs.Root value="pdf-to-images">
	<Tabs.List>
		<Tabs.Trigger value="pdf-to-images">PDF to Images</Tabs.Trigger>
		<Tabs.Trigger value="images-to-pdf">Images to PDF</Tabs.Trigger>
		<Tabs.Trigger value="extract-text">Extract Text</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="pdf-to-images">
		<div class="space-y-4">
			{#if !pdfFile}
				<FileDropzone accept=".pdf" onFiles={handlePdfFiles} />
			{:else}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FileText class="text-muted-foreground size-5" />
						<span class="text-sm font-medium">{pdfFile.name}</span>
						<span class="text-muted-foreground text-xs">{totalPages} pages</span>
					</div>
					<Button variant="ghost" size="icon" onclick={cleanupPdfToImages} aria-label="Remove">
						<X class="size-4" />
					</Button>
				</div>
			{/if}

			{#if pdf}
				<div class="flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-2">
						<span class="text-sm">Format:</span>
						<select
							bind:value={imageFormat}
							class="border-input rounded border px-2 py-1 text-sm"
						>
							<option value="png">PNG</option>
							<option value="jpeg">JPEG</option>
						</select>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm">DPI:</span>
						<select
							bind:value={dpi}
							class="border-input rounded border px-2 py-1 text-sm"
						>
							<option value={72}>72 (Screen)</option>
							<option value={150}>150 (Medium)</option>
							<option value={300}>300 (Print)</option>
						</select>
					</div>
					{#if imageFormat === 'jpeg'}
						<div class="flex items-center gap-2">
							<span class="text-sm">Quality:</span>
							<input
								type="range"
								min="0.1"
								max="1"
								step="0.1"
								bind:value={jpegQuality}
								class="w-24"
							/>
							<span class="text-muted-foreground text-xs">{Math.round(jpegQuality * 100)}%</span>
						</div>
					{/if}
				</div>

				<Button onclick={convertToImages} disabled={converting}>
					{#if converting}
						<LoadingSpinner size="sm" />
						<span class="ml-2">Converting...</span>
					{:else}
						<FileImage class="mr-2 size-4" />
						Convert
					{/if}
				</Button>
			{/if}

			{#if imageResults.length > 0}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold">{imageResults.length} images</h3>
						{#if imageResults.length > 1}
							<Button variant="outline" size="sm" onclick={downloadImagesAsZip}>
								<Download class="mr-1 size-4" />
								Download ZIP
							</Button>
						{/if}
					</div>
					<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
						{#each imageResults as result, i (i)}
							<div class="bg-muted/30 overflow-hidden rounded-lg border">
								<img src={result.url} alt={result.label} class="w-full" />
								<div class="flex items-center justify-between p-2">
									<div>
										<p class="text-xs font-medium">{result.label}</p>
										<p class="text-muted-foreground text-xs">{formatFileSize(result.size)}</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										href={result.url}
										download={`page_${i + 1}.${imageFormat === 'png' ? 'png' : 'jpg'}`}
									>
										<Download class="size-4" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</Tabs.Content>

	<Tabs.Content value="images-to-pdf">
		<div class="space-y-4">
			<FileDropzone accept="image/*" multiple onFiles={handleImageFiles} />

			{#if imageFiles.length > 0}
				<div class="space-y-2">
					{#each imageFiles as imgFile, index (index)}
						<div
							class="flex items-center gap-3 rounded-lg border p-2 transition-colors
								{imgDragOver === index ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : ''}"
							draggable="true"
							role="listitem"
							ondragstart={(e) => handleImgDragStart(index, e)}
							ondragover={(e) => handleImgDragOver(index, e)}
							ondrop={(e) => handleImgDrop(index, e)}
							ondragend={handleImgDragEnd}
						>
							<GripVertical class="text-muted-foreground size-4 cursor-grab" />
							<FileImage class="text-muted-foreground size-4" />
							<span class="min-w-0 flex-1 truncate text-sm">{imgFile.name}</span>
							<span class="text-muted-foreground text-xs">{formatFileSize(imgFile.size)}</span>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => removeImage(index)}
								aria-label="Remove image"
							>
								<X class="size-3" />
							</Button>
						</div>
					{/each}
				</div>

				<div class="flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-2">
						<span class="text-sm">Page size:</span>
						<select
							bind:value={pageSize}
							class="border-input rounded border px-2 py-1 text-sm"
						>
							<option value="fit">Fit to image</option>
							<option value="a4">A4</option>
							<option value="letter">Letter</option>
						</select>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm">Margin:</span>
						<Input
							type="number"
							min={0}
							max={100}
							bind:value={margin}
							class="w-20"
							aria-label="Margin in points"
						/>
						<span class="text-muted-foreground text-xs">pt</span>
					</div>
				</div>

				<Button onclick={buildPdf} disabled={buildingPdf}>
					{#if buildingPdf}
						<LoadingSpinner size="sm" />
						<span class="ml-2">Building...</span>
					{:else}
						Build PDF ({imageFiles.length} images)
					{/if}
				</Button>
			{/if}

			{#if pdfResultUrl}
				<div class="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
					<div class="flex-1">
						<p class="text-sm font-medium">PDF ready</p>
						<p class="text-muted-foreground text-xs">{formatFileSize(pdfResultSize)}</p>
					</div>
					<Button href={pdfResultUrl} download="images.pdf">
						<Download class="mr-2 size-4" />
						Download
					</Button>
				</div>
			{/if}
		</div>
	</Tabs.Content>

	<Tabs.Content value="extract-text">
		<div class="space-y-4">
			{#if !textPdfFile}
				<FileDropzone accept=".pdf" onFiles={handleTextPdfFiles} />
			{:else}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FileText class="text-muted-foreground size-5" />
						<span class="text-sm font-medium">{textPdfFile.name}</span>
						<span class="text-muted-foreground text-xs">{textTotalPages} pages</span>
					</div>
					<Button variant="ghost" size="icon" onclick={cleanupTextExtract} aria-label="Remove">
						<X class="size-4" />
					</Button>
				</div>
			{/if}

			{#if textPdf}
				<div class="flex items-center gap-4">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={preserveLayout} />
						Preserve layout
					</label>
				</div>

				<Button onclick={extractText} disabled={extracting}>
					{#if extracting}
						<LoadingSpinner size="sm" />
						<span class="ml-2">Extracting...</span>
					{:else}
						<FileText class="mr-2 size-4" />
						Extract Text
					{/if}
				</Button>
			{/if}

			{#if extractedText}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold">Extracted Text</h3>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" onclick={copyToClipboard}>
								<Copy class="mr-1 size-4" />
								Copy
							</Button>
							<Button variant="outline" size="sm" onclick={downloadText}>
								<Download class="mr-1 size-4" />
								Download .txt
							</Button>
						</div>
					</div>
					<textarea
						readonly
						value={extractedText}
						class="border-input bg-muted/30 h-96 w-full rounded-lg border p-4 font-mono text-sm"
					></textarea>
				</div>
			{/if}
		</div>
	</Tabs.Content>
</Tabs.Root>

{#if errorMsg}
	<div class="bg-destructive/10 text-destructive mt-4 rounded-lg p-4 text-sm">
		{errorMsg}
	</div>
{/if}