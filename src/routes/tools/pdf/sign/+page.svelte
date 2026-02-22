<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Caveat:wght@700&family=Sacramento&family=Pacifico&display=swap"
	/>
</svelte:head>

<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import { loadPdf, renderPage, formatFileSize } from '$lib/utils/pdf';
	import type { PDFDocumentProxy } from '$lib/utils/pdf';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		FileText,
		X,
		Download,
		Trash2,
		PenLine,
		Type,
		ChevronLeft,
		ChevronRight,
		Check
	} from '@lucide/svelte';

	// --------------- Signature creation ---------------

	let activeTab = $state<'draw' | 'type'>('draw');

	// Draw mode
	let drawCanvas = $state<HTMLCanvasElement | null>(null);
	let isDrawing = $state(false);
	let hasDrawing = $state(false);
	let lastX = 0;
	let lastY = 0;

	// Type mode
	let typedName = $state('');
	let selectedFont = $state('Dancing Script');
	let typeCanvas = $state<HTMLCanvasElement | null>(null);

	const FONTS = [
		{ label: 'Dancing Script', value: 'Dancing Script' },
		{ label: 'Caveat', value: 'Caveat' },
		{ label: 'Sacramento', value: 'Sacramento' },
		{ label: 'Pacifico', value: 'Pacifico' }
	];

	// Final signature
	let signatureDataUrl = $state('');
	let sigAspect = $state(4); // width / height ratio of the signature image

	// --------------- PDF state ---------------

	let file = $state<File | null>(null);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let currentPage = $state(1);
	let totalPages = $state(0);
	let zoom = $state(1.0);

	let pdfCanvas = $state<HTMLCanvasElement | null>(null);
	let pdfContainerRef = $state<HTMLDivElement | null>(null);
	let canvasCssWidth = $state(0);
	let canvasCssHeight = $state(0);

	// --------------- Signature placement ---------------

	interface Placement {
		xFrac: number;
		yFrac: number;
		widthFrac: number;
	}

	// Active drag position (CSS pixels relative to container)
	let sigLeft = $state(40);
	let sigTop = $state(40);
	let sigDisplayWidth = $state(200);

	// Saved placements per page number
	let placements = $state(new SvelteMap<number, Placement>());

	const sigDisplayHeight = $derived(
		sigAspect > 0 ? sigDisplayWidth / sigAspect : sigDisplayWidth / 4
	);

	const currentPlacementSaved = $derived(placements.has(currentPage));

	// --------------- Download state ---------------

	let saving = $state(false);
	let errorMsg = $state('');
	let resultUrl = $state('');
	let resultSize = $state(0);

	// --------------- Drawing events ---------------

	function getCanvasPoint(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
		const rect = canvas.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		return {
			x: (clientX - rect.left) * (canvas.width / rect.width),
			y: (clientY - rect.top) * (canvas.height / rect.height)
		};
	}

	function startDraw(e: MouseEvent | TouchEvent): void {
		if (!drawCanvas) return;
		e.preventDefault();
		isDrawing = true;
		const pt = getCanvasPoint(e, drawCanvas);
		lastX = pt.x;
		lastY = pt.y;
		const ctx = drawCanvas.getContext('2d');
		if (!ctx) return;
		ctx.beginPath();
		ctx.moveTo(pt.x, pt.y);
	}

	function moveDraw(e: MouseEvent | TouchEvent): void {
		if (!isDrawing || !drawCanvas) return;
		e.preventDefault();
		const ctx = drawCanvas.getContext('2d');
		if (!ctx) return;
		const pt = getCanvasPoint(e, drawCanvas);
		ctx.lineTo(pt.x, pt.y);
		ctx.strokeStyle = '#1a1a2e';
		ctx.lineWidth = 3;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
		lastX = pt.x;
		lastY = pt.y;
		hasDrawing = true;
	}

	function endDraw(): void {
		isDrawing = false;
	}

	function clearDraw(): void {
		if (!drawCanvas) return;
		const ctx = drawCanvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
		hasDrawing = false;
	}

	// Render typed name onto the type canvas
	$effect(() => {
		if (activeTab !== 'type' || !typeCanvas) return;
		const name = typedName;
		const font = selectedFont;
		const canvas = typeCanvas;

		document.fonts.load(`700 48px "${font}"`).then(() => {
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			if (!name.trim()) return;

			const fontSize = 72;
			ctx.font = `700 ${fontSize}px "${font}", cursive`;
			const metrics = ctx.measureText(name);
			const textWidth = metrics.width;
			const textHeight = fontSize * 1.2;

			canvas.width = Math.max(400, textWidth + 40);
			canvas.height = textHeight + 20;

			// Re-apply font after resize
			ctx.font = `700 ${fontSize}px "${font}", cursive`;
			ctx.fillStyle = '#1a1a2e';
			ctx.textBaseline = 'top';
			ctx.fillText(name, 20, 10);
		});
	});

	function useDrawSignature(): void {
		if (!drawCanvas || !hasDrawing) return;
		// Crop to bounding box
		const ctx = drawCanvas.getContext('2d');
		if (!ctx) return;
		const imgData = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
		const { minX, minY, maxX, maxY } = getBoundingBox(imgData);
		if (maxX <= minX || maxY <= minY) return;
		const pad = 8;
		const offscreen = document.createElement('canvas');
		offscreen.width = maxX - minX + pad * 2;
		offscreen.height = maxY - minY + pad * 2;
		const oc = offscreen.getContext('2d');
		if (!oc) return;
		oc.drawImage(drawCanvas, -(minX - pad), -(minY - pad));
		signatureDataUrl = offscreen.toDataURL('image/png');
		sigAspect = offscreen.width / offscreen.height;
	}

	function useTypeSignature(): void {
		if (!typeCanvas || !typedName.trim()) return;
		signatureDataUrl = typeCanvas.toDataURL('image/png');
		sigAspect = typeCanvas.width / typeCanvas.height;
	}

	function getBoundingBox(imgData: ImageData) {
		const { data, width, height } = imgData;
		let minX = width, minY = height, maxX = 0, maxY = 0;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const alpha = data[(y * width + x) * 4 + 3];
				if (alpha > 0) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		return { minX, minY, maxX, maxY };
	}

	// --------------- PDF loading & rendering ---------------

	async function handlePdfFile(files: File[]): Promise<void> {
		const pdfFile = files.find(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (!pdfFile) return;
		cleanupPdf();
		file = pdfFile;
		try {
			pdf = await loadPdf(pdfFile);
			totalPages = pdf.numPages;
			currentPage = 1;
		} catch {
			errorMsg = 'Failed to load PDF.';
			file = null;
		}
	}

	$effect(() => {
		if (!pdf || !pdfCanvas) return;
		const page = currentPage;
		const z = zoom;
		pdf.getPage(page).then((p) => {
			renderPage(p, pdfCanvas!, z).then(() => {
				canvasCssWidth = pdfCanvas!.offsetWidth;
				canvasCssHeight = pdfCanvas!.offsetHeight;
				// Restore saved placement if any
				const saved = placements.get(page);
				if (saved) {
					sigLeft = saved.xFrac * canvasCssWidth;
					sigTop = saved.yFrac * canvasCssHeight;
					sigDisplayWidth = saved.widthFrac * canvasCssWidth;
				}
			});
		});
	});

	function cleanupPdf(): void {
		pdf?.destroy();
		pdf = null;
		file = null;
		totalPages = 0;
		currentPage = 1;
		placements = new SvelteMap();
		errorMsg = '';
		resultUrl = '';
	}

	// --------------- Signature dragging ---------------

	function startSigDrag(e: MouseEvent): void {
		e.preventDefault();
		const startMouseX = e.clientX;
		const startMouseY = e.clientY;
		const startLeft = sigLeft;
		const startTop = sigTop;

		function onMove(ev: MouseEvent) {
			sigLeft = startLeft + (ev.clientX - startMouseX);
			sigTop = startTop + (ev.clientY - startMouseY);
		}
		function onUp() {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		}
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	// --------------- Placement management ---------------

	function savePlacementForCurrentPage(): void {
		if (canvasCssWidth === 0 || canvasCssHeight === 0) return;
		placements.set(currentPage, {
			xFrac: sigLeft / canvasCssWidth,
			yFrac: sigTop / canvasCssHeight,
			widthFrac: sigDisplayWidth / canvasCssWidth
		});
	}

	function applyToAllPages(): void {
		if (canvasCssWidth === 0) return;
		const placement: Placement = {
			xFrac: sigLeft / canvasCssWidth,
			yFrac: sigTop / canvasCssHeight,
			widthFrac: sigDisplayWidth / canvasCssWidth
		};
		placements = new SvelteMap(
			Array.from({ length: totalPages }, (_, i) => [i + 1, placement] as [number, Placement])
		);
	}

	function clearPagePlacement(): void {
		placements.delete(currentPage);
	}

	// --------------- Download ---------------

	async function downloadSigned(): Promise<void> {
		if (!file || placements.size === 0 || !signatureDataUrl) return;
		saving = true;
		errorMsg = '';
		resultUrl = '';

		try {
			const { PDFDocument } = await import('pdf-lib');

			const [pdfBytes, sigBytes] = await Promise.all([
				file.arrayBuffer(),
				fetch(signatureDataUrl).then((r) => r.arrayBuffer())
			]);

			const pdfDoc = await PDFDocument.load(pdfBytes);
			const sigImage = await pdfDoc.embedPng(sigBytes);

			const pages = pdfDoc.getPages();

			for (const [pageNum, pl] of placements) {
				const page = pages[pageNum - 1];
				if (!page) continue;
				const { width: pageW, height: pageH } = page.getSize();
				const sigW = pl.widthFrac * pageW;
				const sigH = sigW / sigAspect;
				// PDF y-axis goes up; convert from top-based CSS coords
				const pdfX = pl.xFrac * pageW;
				const pdfY = pageH - pl.yFrac * pageH - sigH;
				page.drawImage(sigImage, {
					x: pdfX,
					y: pdfY,
					width: sigW,
					height: sigH
				});
			}

			const outBytes = await pdfDoc.save();
			const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Failed to sign PDF.';
		} finally {
			saving = false;
		}
	}
</script>

<ToolHeader
	title="Sign PDF"
	description="Draw or type your signature and place it on any PDF page"
/>

<div class="space-y-6">

	<!-- Signature creation -->
	<div class="rounded-lg border p-4">
		<h2 class="mb-3 text-base font-medium">1. Create your signature</h2>

		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="mb-4">
				<Tabs.Trigger value="draw">
					<PenLine class="mr-2 size-4" />
					Draw
				</Tabs.Trigger>
				<Tabs.Trigger value="type">
					<Type class="mr-2 size-4" />
					Type
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="draw" class="space-y-3">
				<canvas
					bind:this={drawCanvas}
					width="600"
					height="160"
					class="w-full touch-none rounded-md border bg-white"
					style="cursor: crosshair;"
					onmousedown={startDraw}
					onmousemove={moveDraw}
					onmouseup={endDraw}
					onmouseleave={endDraw}
					ontouchstart={startDraw}
					ontouchmove={moveDraw}
					ontouchend={endDraw}
					aria-label="Signature drawing area"
				></canvas>
				<p class="text-muted-foreground text-xs">Draw your signature above with mouse or touch.</p>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={clearDraw} disabled={!hasDrawing}>
						<Trash2 class="mr-1 size-4" /> Clear
					</Button>
					<Button size="sm" onclick={useDrawSignature} disabled={!hasDrawing}>
						<Check class="mr-1 size-4" /> Use this signature
					</Button>
				</div>
			</Tabs.Content>

			<Tabs.Content value="type" class="space-y-3">
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1">
						<Label for="typed-name">Your name</Label>
						<Input id="typed-name" bind:value={typedName} placeholder="e.g. Jane Smith" />
					</div>
					<div class="space-y-1">
						<Label>Signature style</Label>
						<div class="flex flex-wrap gap-2">
							{#each FONTS as f (f.value)}
								<button
									onclick={() => (selectedFont = f.value)}
									class="rounded border px-3 py-1 text-sm transition-colors"
									class:bg-primary={selectedFont === f.value}
									class:text-primary-foreground={selectedFont === f.value}
									class:border-primary={selectedFont === f.value}
									style="font-family: '{f.value}', cursive;"
								>
									{f.label}
								</button>
							{/each}
						</div>
					</div>
				</div>

				{#if typedName.trim()}
					<div class="rounded-md border bg-white p-3">
						<canvas
							bind:this={typeCanvas}
							width="400"
							height="100"
							class="max-w-full"
							aria-label="Signature preview"
						></canvas>
					</div>
				{/if}

				<Button size="sm" onclick={useTypeSignature} disabled={!typedName.trim()}>
					<Check class="mr-1 size-4" /> Use this signature
				</Button>
			</Tabs.Content>
		</Tabs.Root>

		{#if signatureDataUrl}
			<div class="mt-4 flex items-center gap-3 rounded-md border bg-green-500/5 p-3">
				<img src={signatureDataUrl} alt="Selected signature" class="h-12 max-w-48 object-contain" />
				<div class="flex-1 text-xs text-green-700 dark:text-green-400">Signature ready</div>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => (signatureDataUrl = '')}
					aria-label="Remove signature"
				>
					<X class="size-4" />
				</Button>
			</div>
		{/if}
	</div>

	<!-- PDF upload and placement -->
	{#if signatureDataUrl}
		<div class="rounded-lg border p-4">
			<h2 class="mb-3 text-base font-medium">2. Upload your PDF</h2>

			{#if !file}
				<FileDropzone accept=".pdf" onFiles={handlePdfFile} />
			{:else}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FileText class="text-muted-foreground size-5" />
						<span class="text-sm font-medium">{file.name}</span>
						<span class="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
					</div>
					<Button variant="ghost" size="icon" onclick={cleanupPdf} aria-label="Remove">
						<X class="size-4" />
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	{#if signatureDataUrl && pdf}
		<div class="rounded-lg border p-4">
			<h2 class="mb-1 text-base font-medium">3. Place the signature</h2>
			<p class="text-muted-foreground mb-3 text-xs">
				Drag your signature to position it. Adjust size with the slider.
			</p>

			<!-- Size slider -->
			<div class="mb-3 flex items-center gap-3">
				<Label class="w-20 shrink-0 text-sm">Size</Label>
				<input
					type="range"
					min="50"
					max="600"
					bind:value={sigDisplayWidth}
					class="flex-1"
					aria-label="Signature size"
				/>
				<span class="text-muted-foreground w-16 text-right text-sm">{sigDisplayWidth}px</span>
			</div>

			<!-- PDF page with signature overlay -->
			<div
				bind:this={pdfContainerRef}
				class="bg-muted/30 relative overflow-auto rounded-md border"
				style="max-height: 70vh;"
			>
				<canvas bind:this={pdfCanvas} class="block"></canvas>

				<!-- Draggable signature -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					style="position: absolute; left: {sigLeft}px; top: {sigTop}px; width: {sigDisplayWidth}px; cursor: move;"
					onmousedown={startSigDrag}
					role="presentation"
				>
					<img
						src={signatureDataUrl}
						alt="Signature"
						style="width: 100%; height: {sigDisplayHeight}px; object-fit: contain; opacity: 0.9; pointer-events: none;"
						draggable="false"
					/>
					<div
						class="border-primary/60 absolute inset-0 rounded border-2 border-dashed"
						style="pointer-events: none;"
					></div>
				</div>
			</div>

			<!-- Page navigation -->
			{#if totalPages > 1}
				<div class="mt-3 flex items-center justify-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage <= 1}
					>
						<ChevronLeft class="size-4" />
					</Button>
					<span class="text-muted-foreground text-sm">Page {currentPage} of {totalPages}</span>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage >= totalPages}
					>
						<ChevronRight class="size-4" />
					</Button>
				</div>
			{/if}

			<!-- Placement actions -->
			<div class="mt-4 flex flex-wrap gap-2">
				<Button size="sm" onclick={savePlacementForCurrentPage}>
					{#if currentPlacementSaved}
						<Check class="mr-1 size-4" />
						Page {currentPage} marked
					{:else}
						<Check class="mr-1 size-4" />
						Mark page {currentPage}
					{/if}
				</Button>
				<Button variant="outline" size="sm" onclick={applyToAllPages}>
					Apply to all pages
				</Button>
				{#if currentPlacementSaved}
					<Button variant="ghost" size="sm" onclick={clearPagePlacement}>
						<Trash2 class="mr-1 size-4" />
						Clear page {currentPage}
					</Button>
				{/if}
			</div>

			{#if placements.size > 0}
				<p class="text-muted-foreground mt-2 text-xs">
					Signature placed on {placements.size} {placements.size === 1 ? 'page' : 'pages'}.
				</p>
			{/if}
		</div>

		<!-- Download -->
		<div class="flex flex-col gap-2">
			<Button
				size="lg"
				onclick={downloadSigned}
				disabled={saving || placements.size === 0}
				class="self-start"
			>
				{#if saving}
					<LoadingSpinner size="sm" />
					<span class="ml-2">Signing...</span>
				{:else}
					<Download class="mr-2 size-4" />
					Download Signed PDF
				{/if}
			</Button>
			{#if placements.size === 0}
				<p class="text-muted-foreground text-xs">Mark at least one page to enable download.</p>
			{/if}
		</div>

		{#if resultUrl}
			<div class="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
				<div class="flex-1">
					<p class="text-sm font-medium">Signed PDF ready</p>
					<p class="text-muted-foreground text-xs">{formatFileSize(resultSize)}</p>
				</div>
				<Button
					href={resultUrl}
					download={file?.name?.replace(/\.pdf$/i, '_signed.pdf') ?? 'signed.pdf'}
				>
					<Download class="mr-2 size-4" />
					Download
				</Button>
			</div>
		{/if}
	{/if}

	{#if errorMsg}
		<div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
			{errorMsg}
		</div>
	{/if}
</div>
