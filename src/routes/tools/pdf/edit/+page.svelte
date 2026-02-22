<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { loadPdf, renderPage } from '$lib/utils/pdf';
	import type { PDFDocumentProxy } from '$lib/utils/pdf';
	import { formatFileSize } from '$lib/utils/pdf';
	import { tick } from 'svelte';
	import {
		Download,
		FileText,
		X,
		Undo2,
		ZoomIn,
		ZoomOut,
		Type
	} from '@lucide/svelte';

	interface TextBlock {
		id: string;
		text: string;
		x: number;
		y: number;
		width: number;
		height: number;
		fontSize: number;
		page: number;
	}

	interface TextEdit {
		block: TextBlock;
		newText: string;
		newFontSize: number;
		newColor: string;
	}

	let file = $state<File | null>(null);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let currentPage = $state(1);
	let totalPages = $state(0);
	let zoom = $state(1.0);

	let pdfCanvasRef = $state<HTMLCanvasElement | null>(null);
	let overlayRef = $state<HTMLDivElement | null>(null);
	let canvasWidth = $state(0);
	let canvasHeight = $state(0);

	let textBlocks = $state<TextBlock[]>([]);
	let selectedBlock = $state<TextBlock | null>(null);
	let edits = $state<TextEdit[]>([]);
	let editText = $state('');
	let editFontSize = $state(12);
	let editColor = $state('#000000');

	let saving = $state(false);
	let errorMsg = $state('');
	let resultUrl = $state('');
	let resultSize = $state(0);
	let renderingInProgress = false;
	let pendingRender = false;

	const hasEdits = $derived(edits.length > 0);
	const currentPageEdits = $derived(edits.filter((e) => e.block.page === currentPage));

	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 3.0;
	const ZOOM_STEP = 0.25;

	async function handleFiles(newFiles: File[]): Promise<void> {
		const pdfFile = newFiles.find(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (!pdfFile) return;

		cleanup();
		file = pdfFile;
		errorMsg = '';

		try {
			pdf = await loadPdf(pdfFile);
			totalPages = pdf.numPages;
			await tick();
			renderCurrentPage();
		} catch {
			errorMsg = 'Failed to load PDF.';
			file = null;
		}
	}

	function drawEditsOnCanvas(): void {
		if (!pdfCanvasRef || currentPageEdits.length === 0) return;
		const ctx = pdfCanvasRef.getContext('2d');
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;

		for (const edit of currentPageEdits) {
			const block = edit.block;
			// Canvas draws in physical pixels; block coords are PDF user-space, scaled by zoom
			const sx = block.x * zoom * dpr;
			const sy = canvasHeight * dpr - block.y * zoom * dpr - block.height * zoom * dpr;
			const sw = block.width * zoom * dpr;
			const sh = block.height * zoom * dpr + 4 * dpr;

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(sx - dpr, sy - dpr, sw + 2 * dpr, sh + 2 * dpr);

			const scaledFontSize = edit.newFontSize * zoom * dpr;
			ctx.fillStyle = edit.newColor;
			ctx.font = `${scaledFontSize}px Helvetica, Arial, sans-serif`;
			ctx.textBaseline = 'top';
			ctx.fillText(edit.newText, sx, sy + dpr);
		}
	}

	async function redrawCanvas(): Promise<void> {
		if (!pdf || !pdfCanvasRef) return;
		const page = await pdf.getPage(currentPage);
		await renderPage(page, pdfCanvasRef, zoom);
		canvasWidth = pdfCanvasRef.offsetWidth;
		canvasHeight = pdfCanvasRef.offsetHeight;
		drawEditsOnCanvas();
	}

	async function renderCurrentPage(): Promise<void> {
		if (!pdf || !pdfCanvasRef) return;

		if (renderingInProgress) {
			pendingRender = true;
			return;
		}
		renderingInProgress = true;
		pendingRender = false;

		try {
			const page = await pdf.getPage(currentPage);
			await renderPage(page, pdfCanvasRef, zoom);

			canvasWidth = pdfCanvasRef.offsetWidth;
			canvasHeight = pdfCanvasRef.offsetHeight;

			const content = await page.getTextContent();

			const blocks: TextBlock[] = [];
			for (const item of content.items) {
				if (!('str' in item) || !item.str.trim()) continue;

				const tx = item.transform;
				const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
				const x = tx[4];
				const y = tx[5];
				const width = item.width;
				const height = fontSize;

				blocks.push({
					id: crypto.randomUUID(),
					text: item.str,
					x,
					y,
					width,
					height,
					fontSize,
					page: currentPage
				});
			}

			textBlocks = blocks;
			selectedBlock = null;
			drawEditsOnCanvas();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Failed to render page';
		} finally {
			renderingInProgress = false;
			if (pendingRender) {
				renderCurrentPage();
			}
		}
	}

	// Full render on page/zoom/pdf change (re-extracts text blocks)
	$effect(() => {
		if (pdf && currentPage && pdfCanvasRef) {
			const _page = currentPage;
			const _zoom = zoom;
			const _pdf = pdf;
			const _canvas = pdfCanvasRef;
			renderCurrentPage();
		}
	});

	// Lightweight redraw when edits change (canvas only, no text re-extraction)
	$effect(() => {
		const _edits = edits;
		if (pdf && pdfCanvasRef && textBlocks.length > 0) {
			redrawCanvas();
		}
	});

	function selectBlock(block: TextBlock): void {
		const existing = edits.find((e) => e.block.id === block.id);
		selectedBlock = block;
		editText = existing?.newText ?? block.text;
		editFontSize = existing?.newFontSize ?? Math.round(block.fontSize);
		editColor = existing?.newColor ?? '#000000';
	}

	function applyEdit(): void {
		if (!selectedBlock) return;

		const existingIdx = edits.findIndex((e) => e.block.id === selectedBlock!.id);
		const edit: TextEdit = {
			block: selectedBlock,
			newText: editText,
			newFontSize: editFontSize,
			newColor: editColor
		};

		if (existingIdx >= 0) {
			edits = [...edits.slice(0, existingIdx), edit, ...edits.slice(existingIdx + 1)];
		} else {
			edits = [...edits, edit];
		}

		selectedBlock = null;
	}

	function cancelEdit(): void {
		selectedBlock = null;
	}

	function undoLastEdit(): void {
		if (edits.length === 0) return;
		edits = edits.slice(0, -1);
	}

	function blockToViewport(block: TextBlock): { left: string; top: string; width: string; height: string } {
		if (!pdfCanvasRef || !pdf) return { left: '0', top: '0', width: '0', height: '0' };

		const viewportY = canvasHeight - block.y * zoom - block.height * zoom;

		return {
			left: `${block.x * zoom}px`,
			top: `${viewportY}px`,
			width: `${block.width * zoom}px`,
			height: `${block.height * zoom + 4}px`
		};
	}

	function isEdited(blockId: string): boolean {
		return edits.some((e) => e.block.id === blockId);
	}

	async function saveAndDownload(): Promise<void> {
		if (!file || edits.length === 0) return;
		saving = true;
		errorMsg = '';
		revokeResult();

		try {
			const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
			const buffer = await file.arrayBuffer();
			const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
			const helvetica = await doc.embedFont(StandardFonts.Helvetica);

			for (const edit of edits) {
				const page = doc.getPage(edit.block.page - 1);

				const color = hexToRgb(edit.newColor);

				// block.x and block.y are in PDF coordinate space (origin at bottom-left)
				// pdf-lib also uses PDF coordinates, so no conversion needed
				page.drawRectangle({
					x: edit.block.x - 1,
					y: edit.block.y - 1,
					width: edit.block.width + 2,
					height: edit.block.height + 2,
					color: rgb(1, 1, 1)
				});

				page.drawText(edit.newText, {
					x: edit.block.x,
					y: edit.block.y,
					size: edit.newFontSize,
					font: helvetica,
					color: rgb(color.r, color.g, color.b)
				});
			}

			const savedBytes = await doc.save();
			const blob = new Blob([savedBytes as BlobPart], { type: 'application/pdf' });
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	function hexToRgb(hex: string): { r: number; g: number; b: number } {
		const h = hex.replace('#', '');
		return {
			r: parseInt(h.substring(0, 2), 16) / 255,
			g: parseInt(h.substring(2, 4), 16) / 255,
			b: parseInt(h.substring(4, 6), 16) / 255
		};
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
		edits = [];
		textBlocks = [];
		selectedBlock = null;
		errorMsg = '';
	}

	function goToPage(page: number): void {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}
</script>

<ToolHeader title="Edit PDF" description="Click on text to edit it inline" />

<div class="space-y-4">
	<div class="bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200 rounded-lg border border-amber-200 p-3 text-sm dark:border-amber-800">
		<Badge variant="outline" class="mr-2">Beta</Badge>
		Text editing uses a white-out and redraw approach. Edited text uses Helvetica font. Layout
		may shift if text length changes. Some text in custom encodings may not display correctly.
	</div>

	{#if !file}
		<FileDropzone accept=".pdf" onFiles={handleFiles} />
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="text-muted-foreground size-5" />
				<span class="text-sm font-medium">{file.name}</span>
			</div>
			<Button variant="ghost" size="icon" onclick={cleanup} aria-label="Remove">
				<X class="size-4" />
			</Button>
		</div>
	{/if}

	{#if pdf}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (zoom = Math.max(zoom - ZOOM_STEP, MIN_ZOOM))}
					disabled={zoom <= MIN_ZOOM}
				>
					<ZoomOut class="size-4" />
				</Button>
				<span class="text-muted-foreground text-xs">{Math.round(zoom * 100)}%</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => (zoom = Math.min(zoom + ZOOM_STEP, MAX_ZOOM))}
					disabled={zoom >= MAX_ZOOM}
				>
					<ZoomIn class="size-4" />
				</Button>
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage <= 1}
				>
					Prev
				</Button>
				<span class="text-muted-foreground text-xs">
					Page {currentPage} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage >= totalPages}
				>
					Next
				</Button>
			</div>

			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={undoLastEdit} disabled={!hasEdits}>
					<Undo2 class="mr-1 size-4" />
					Undo
				</Button>
				<Button onclick={saveAndDownload} disabled={!hasEdits || saving}>
					{#if saving}
						<LoadingSpinner size="sm" />
						<span class="ml-2">Saving...</span>
					{:else}
						<Download class="mr-2 size-4" />
						Save
					{/if}
				</Button>
			</div>
		</div>

		<div class="bg-muted/30 relative overflow-auto rounded-lg border" style="max-height: 70vh;">
			<div class="relative inline-block">
				<canvas bind:this={pdfCanvasRef} class="block"></canvas>

				<div
					bind:this={overlayRef}
					class="absolute top-0 left-0"
					style="width: {canvasWidth}px; height: {canvasHeight}px;"
				>
					{#each textBlocks as block (block.id)}
						{@const pos = blockToViewport(block)}
						<button
							class="absolute cursor-pointer rounded-sm border border-blue-300/70 bg-blue-50/20 transition-colors hover:border-blue-500 hover:bg-blue-100/40 dark:border-blue-600/50 dark:bg-blue-900/20 dark:hover:border-blue-400 dark:hover:bg-blue-800/40
								{selectedBlock?.id === block.id ? 'border-blue-500 bg-blue-100/50 dark:border-blue-400 dark:bg-blue-800/50' : ''}
								{isEdited(block.id) ? 'bg-yellow-100/40 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600' : ''}"
							style="left: {pos.left}; top: {pos.top}; width: max({pos.width}, 20px); height: max({pos.height}, 14px);"
							onclick={() => selectBlock(block)}
						>
							<span class="sr-only">Edit text: {block.text}</span>
						</button>
					{/each}
				</div>

				{#if selectedBlock}
					{@const pos = blockToViewport(selectedBlock)}
					<div
						class="absolute z-20 rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-900"
						style="left: {pos.left}; top: calc({pos.top} + {pos.height} + 4px); min-width: 280px;"
					>
						<div class="space-y-3">
							<div class="space-y-1">
								<span class="text-muted-foreground text-xs">Original: {selectedBlock.text}</span>
								<Input
									bind:value={editText}
									placeholder="New text"
									aria-label="Edit text"
								/>
							</div>
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1">
									<Type class="text-muted-foreground size-4" />
									<Input
										type="number"
										min={6}
										max={72}
										bind:value={editFontSize}
										class="w-16"
										aria-label="Font size"
									/>
								</div>
								<input
									type="color"
									bind:value={editColor}
									class="size-8 cursor-pointer rounded border-0"
									aria-label="Text color"
								/>
							</div>
							<div class="flex justify-end gap-2">
								<Button variant="outline" size="sm" onclick={cancelEdit}>
									Cancel
								</Button>
								<Button size="sm" onclick={applyEdit}>
									Apply
								</Button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		{#if textBlocks.length > 0}
			<div class="text-muted-foreground text-xs">
				{textBlocks.length} text block{textBlocks.length !== 1 ? 's' : ''} found - click any to edit
				{#if hasEdits}
					&middot; {edits.length} edit{edits.length !== 1 ? 's' : ''} pending
				{/if}
			</div>
		{:else if pdf && !errorMsg}
			<div class="text-muted-foreground text-xs">
				No editable text found on this page
			</div>
		{/if}
	{/if}

	{#if errorMsg}
		<div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
			{errorMsg}
		</div>
	{/if}

	{#if resultUrl}
		<div class="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
			<div class="flex-1">
				<p class="text-sm font-medium">Edited PDF saved</p>
				<p class="text-muted-foreground text-xs">{formatFileSize(resultSize)}</p>
			</div>
			<Button href={resultUrl} download={file?.name?.replace(/\.pdf$/i, '_edited.pdf') ?? 'edited.pdf'}>
				<Download class="mr-2 size-4" />
				Download
			</Button>
		</div>
	{/if}
</div>