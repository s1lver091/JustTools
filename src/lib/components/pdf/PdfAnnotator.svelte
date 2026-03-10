<script lang="ts">
	import { loadPdf, renderPage } from '$lib/utils/pdf';
	import type { PDFDocumentProxy, PDFPageProxy } from '$lib/utils/pdf';
	import type {
		Annotation,
		AnnotationTool,
		Rect,
		PenAnnotation,
		ShapeAnnotation
	} from '$lib/utils/pdf-annotations.svelte';
	import { AnnotationHistory } from '$lib/utils/pdf-annotations.svelte';

	interface Props {
		file: File;
		annotations?: AnnotationHistory;
		currentTool?: AnnotationTool;
		currentColor?: string;
		strokeThickness?: number;
		zoom?: number;
		currentPage?: number;
		totalPages?: number;
		onerror?: (message: string) => void;
	}

	let {
		file,
		annotations = $bindable(new AnnotationHistory()),
		currentTool = 'highlight',
		currentColor = '#FFFF00',
		strokeThickness = 2,
		zoom = $bindable(1.0),
		currentPage = $bindable(1),
		totalPages = $bindable(0),
		onerror
	}: Props = $props();

	let pdf = $state<PDFDocumentProxy | null>(null);
	let pdfCanvas = $state<HTMLCanvasElement | null>(null);
	let overlayCanvas = $state<HTMLCanvasElement | null>(null);
	let containerRef = $state<HTMLDivElement | null>(null);
	let canvasWidth = $state(0);
	let canvasHeight = $state(0);

	// Drawing state
	let isDrawing = $state(false);
	let drawStart = $state<{ x: number; y: number } | null>(null);
	let penPoints = $state<{ x: number; y: number }[]>([]);

	// Pending text annotation state
	let pendingTextAnnotation = $state<{ x: number; y: number } | null>(null);
	let pendingText = $state('');
	let renderingInProgress = false;
	let pendingRender = false;

	// Text selection state
	let textLayerItems = $state<Array<{
		str: string;
		x: number;
		y: number;
		width: number;
		height: number;
	}>>([]);
	let selectionStart = $state<{ x: number; y: number } | null>(null);
	let selectionEnd = $state<{ x: number; y: number } | null>(null);

	// PDF coordinate scale factor (accounts for devicePixelRatio)
	let pdfViewport = $state<{ width: number; height: number; scale: number } | null>(null);

	$effect(() => {
		const currentFile = file;
		let cancelled = false;

		loadPdf(currentFile).then((doc) => {
			if (cancelled) {
				doc.destroy();
				return;
			}
			pdf = doc;
			totalPages = doc.numPages;
			if (currentPage > doc.numPages) currentPage = 1;
		}).catch((e) => {
			const message = e instanceof Error ? e.message : 'Failed to load PDF';
			onerror?.(message);
		});

		return () => {
			cancelled = true;
			if (pdf) {
				pdf.destroy();
				pdf = null;
			}
		};
	});

	async function renderCurrentAnnotatorPage(): Promise<void> {
		if (!pdf || !pdfCanvas) return;

		if (renderingInProgress) {
			pendingRender = true;
			return;
		}
		renderingInProgress = true;
		pendingRender = false;

		try {
			const page: PDFPageProxy = await pdf.getPage(currentPage);
			await renderPage(page, pdfCanvas, zoom);
			canvasWidth = pdfCanvas.offsetWidth;
			canvasHeight = pdfCanvas.offsetHeight;

			const vp = page.getViewport({ scale: zoom });
			pdfViewport = { width: vp.width, height: vp.height, scale: zoom };

			const content = await page.getTextContent();
			const items: typeof textLayerItems = [];
			for (const item of content.items) {
				if (!('str' in item) || !item.str.trim()) continue;
				const tx = item.transform;
				const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
				items.push({
					str: item.str,
					x: tx[4],
					y: tx[5],
					width: item.width,
					height: fontSize
				});
			}
			textLayerItems = items;

			redrawOverlay();
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to render page';
			onerror?.(message);
		} finally {
			renderingInProgress = false;
			if (pendingRender) {
				renderCurrentAnnotatorPage();
			}
		}
	}

	$effect(() => {
		if (pdf && currentPage && zoom && pdfCanvas) {
			renderCurrentAnnotatorPage();
		}
	});

	$effect(() => {
		// Redraw when annotations change
		const _annotations = annotations.annotations;
		const _page = currentPage;
		redrawOverlay();
	});

	function getCanvasPoint(e: PointerEvent): { x: number; y: number } {
		const rect = overlayCanvas!.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
	}

	function canvasToPdf(point: { x: number; y: number }): { x: number; y: number } {
		return {
			x: point.x / zoom,
			y: (canvasHeight - point.y) / zoom
		};
	}

	function pdfToCanvas(point: { x: number; y: number }): { x: number; y: number } {
		return {
			x: point.x * zoom,
			y: canvasHeight - point.y * zoom
		};
	}

	function isTextTool(tool: AnnotationTool): boolean {
		return tool === 'highlight' || tool === 'underline' || tool === 'strikethrough';
	}

	function handlePointerDown(e: PointerEvent): void {
		const point = getCanvasPoint(e);

		if (currentTool === 'eraser') {
			eraseAtPoint(point);
			return;
		}

		if (currentTool === 'text') {
			const pdfPoint = canvasToPdf(point);
			pendingTextAnnotation = { x: pdfPoint.x, y: pdfPoint.y };
			pendingText = '';
			return;
		}

		isDrawing = true;
		drawStart = point;

		if (currentTool === 'pen') {
			penPoints = [canvasToPdf(point)];
		}

		if (isTextTool(currentTool)) {
			selectionStart = point;
			selectionEnd = null;
		}
	}

	function handlePointerMove(e: PointerEvent): void {
		if (!isDrawing) return;
		const point = getCanvasPoint(e);

		if (currentTool === 'pen') {
			penPoints = [...penPoints, canvasToPdf(point)];
			redrawOverlay();
			drawLivePen();
			return;
		}

		if (isTextTool(currentTool)) {
			selectionEnd = point;
			redrawOverlay();
			drawLiveSelection();
			return;
		}

		// Shape tools
		if (['rectangle', 'circle', 'arrow', 'line'].includes(currentTool)) {
			redrawOverlay();
			drawLiveShape(point);
		}
	}

	function handlePointerUp(e: PointerEvent): void {
		if (!isDrawing) return;
		isDrawing = false;
		const point = getCanvasPoint(e);

		if (currentTool === 'pen' && penPoints.length > 1) {
			annotations.add({
				id: crypto.randomUUID(),
				type: 'pen',
				page: currentPage,
				color: currentColor,
				thickness: strokeThickness,
				points: penPoints
			});
			penPoints = [];
			redrawOverlay();
			return;
		}

		if (isTextTool(currentTool) && selectionStart) {
			const rects = getSelectedTextRects(selectionStart, point);
			if (rects.length > 0) {
				annotations.add({
					id: crypto.randomUUID(),
					type: currentTool as 'highlight' | 'underline' | 'strikethrough',
					page: currentPage,
					color: currentColor,
					rects
				});
			}
			selectionStart = null;
			selectionEnd = null;
			redrawOverlay();
			return;
		}

		if (['rectangle', 'circle', 'arrow', 'line'].includes(currentTool) && drawStart) {
			const pdfStart = canvasToPdf(drawStart);
			const pdfEnd = canvasToPdf(point);
			const shapeType = currentTool as 'rectangle' | 'circle' | 'arrow' | 'line';

			annotations.add({
				id: crypto.randomUUID(),
				type: 'shape',
				page: currentPage,
				color: currentColor,
				thickness: strokeThickness,
				shapeType,
				start: pdfStart,
				end: pdfEnd
			});
			drawStart = null;
			redrawOverlay();
		}
	}

	function getSelectedTextRects(
		start: { x: number; y: number },
		end: { x: number; y: number }
	): Rect[] {
		const left = Math.min(start.x, end.x);
		const right = Math.max(start.x, end.x);
		const top = Math.min(start.y, end.y);
		const bottom = Math.max(start.y, end.y);

		const rects: Rect[] = [];
		for (const item of textLayerItems) {
			const itemCanvasPos = pdfToCanvas({ x: item.x, y: item.y });
			const itemCanvasY = itemCanvasPos.y - item.height * zoom;
			const itemRight = itemCanvasPos.x + item.width * zoom;
			const itemBottom = itemCanvasPos.y;

			if (
				itemCanvasPos.x < right &&
				itemRight > left &&
				itemCanvasY < bottom &&
				itemBottom > top
			) {
				rects.push({
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height
				});
			}
		}

		return rects;
	}

	function eraseAtPoint(point: { x: number; y: number }): void {
		const pdfPoint = canvasToPdf(point);
		const pageAnnotations = annotations.getForPage(currentPage);
		const threshold = 10 / zoom;

		for (const ann of pageAnnotations) {
			if (ann.type === 'pen') {
				for (const p of ann.points) {
					const dist = Math.sqrt(
						(p.x - pdfPoint.x) ** 2 + (p.y - pdfPoint.y) ** 2
					);
					if (dist < threshold) {
						annotations.remove(ann.id);
						redrawOverlay();
						return;
					}
				}
			} else if (ann.type === 'highlight' || ann.type === 'underline' || ann.type === 'strikethrough') {
				for (const r of ann.rects) {
					const canvasRect = {
						x: r.x * zoom,
						y: canvasHeight - r.y * zoom - r.height * zoom,
						width: r.width * zoom,
						height: r.height * zoom
					};
					if (
						point.x >= canvasRect.x &&
						point.x <= canvasRect.x + canvasRect.width &&
						point.y >= canvasRect.y &&
						point.y <= canvasRect.y + canvasRect.height
					) {
						annotations.remove(ann.id);
						redrawOverlay();
						return;
					}
				}
			} else if (ann.type === 'shape') {
				const s = pdfToCanvas(ann.start);
				const en = pdfToCanvas(ann.end);
				const minX = Math.min(s.x, en.x) - 5;
				const maxX = Math.max(s.x, en.x) + 5;
				const minY = Math.min(s.y, en.y) - 5;
				const maxY = Math.max(s.y, en.y) + 5;
				if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
					annotations.remove(ann.id);
					redrawOverlay();
					return;
				}
			} else if (ann.type === 'text') {
				const cp = pdfToCanvas(ann.position);
				if (
					point.x >= cp.x &&
					point.x <= cp.x + 100 &&
					point.y >= cp.y - ann.fontSize * zoom &&
					point.y <= cp.y
				) {
					annotations.remove(ann.id);
					redrawOverlay();
					return;
				}
			}
		}
	}

	function redrawOverlay(): void {
		if (!overlayCanvas) return;

		overlayCanvas.width = canvasWidth * window.devicePixelRatio;
		overlayCanvas.height = canvasHeight * window.devicePixelRatio;
		overlayCanvas.style.width = `${canvasWidth}px`;
		overlayCanvas.style.height = `${canvasHeight}px`;

		const ctx = overlayCanvas.getContext('2d');
		if (!ctx) return;

		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		const pageAnnotations = annotations.getForPage(currentPage);
		for (const ann of pageAnnotations) {
			drawAnnotation(ctx, ann);
		}
	}

	function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation): void {
		ctx.save();

		switch (ann.type) {
			case 'highlight': {
				ctx.globalAlpha = 0.3;
				ctx.fillStyle = ann.color;
				for (const r of ann.rects) {
					const y = canvasHeight - r.y * zoom - r.height * zoom;
					ctx.fillRect(r.x * zoom, y, r.width * zoom, r.height * zoom);
				}
				break;
			}
			case 'underline': {
				ctx.strokeStyle = ann.color;
				ctx.lineWidth = 2;
				for (const r of ann.rects) {
					const y = canvasHeight - r.y * zoom + 2;
					ctx.beginPath();
					ctx.moveTo(r.x * zoom, y);
					ctx.lineTo(r.x * zoom + r.width * zoom, y);
					ctx.stroke();
				}
				break;
			}
			case 'strikethrough': {
				ctx.strokeStyle = ann.color;
				ctx.lineWidth = 2;
				for (const r of ann.rects) {
					const y = canvasHeight - r.y * zoom - (r.height * zoom) / 2;
					ctx.beginPath();
					ctx.moveTo(r.x * zoom, y);
					ctx.lineTo(r.x * zoom + r.width * zoom, y);
					ctx.stroke();
				}
				break;
			}
			case 'pen': {
				drawPenStroke(ctx, ann);
				break;
			}
			case 'shape': {
				drawShape(ctx, ann);
				break;
			}
			case 'text': {
				const cp = pdfToCanvas(ann.position);
				ctx.fillStyle = ann.color;
				ctx.font = `${ann.fontSize * zoom}px Helvetica, Arial, sans-serif`;
				ctx.fillText(ann.content, cp.x, cp.y);
				break;
			}
		}

		ctx.restore();
	}

	function drawPenStroke(
		ctx: CanvasRenderingContext2D,
		ann: PenAnnotation
	): void {
		if (ann.points.length < 2) return;
		ctx.strokeStyle = ann.color;
		ctx.lineWidth = ann.thickness * zoom;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();

		const first = pdfToCanvas(ann.points[0]);
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < ann.points.length; i++) {
			const p = pdfToCanvas(ann.points[i]);
			ctx.lineTo(p.x, p.y);
		}
		ctx.stroke();
	}

	function drawShape(ctx: CanvasRenderingContext2D, ann: ShapeAnnotation): void {
		const s = pdfToCanvas(ann.start);
		const e = pdfToCanvas(ann.end);
		ctx.strokeStyle = ann.color;
		ctx.lineWidth = ann.thickness * zoom;

		switch (ann.shapeType) {
			case 'rectangle':
				ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y);
				break;
			case 'circle': {
				const cx = (s.x + e.x) / 2;
				const cy = (s.y + e.y) / 2;
				const rx = Math.abs(e.x - s.x) / 2;
				const ry = Math.abs(e.y - s.y) / 2;
				ctx.beginPath();
				ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
				ctx.stroke();
				break;
			}
			case 'line':
				ctx.beginPath();
				ctx.moveTo(s.x, s.y);
				ctx.lineTo(e.x, e.y);
				ctx.stroke();
				break;
			case 'arrow': {
				ctx.beginPath();
				ctx.moveTo(s.x, s.y);
				ctx.lineTo(e.x, e.y);
				ctx.stroke();

				const angle = Math.atan2(e.y - s.y, e.x - s.x);
				const headLen = 12 * zoom;
				ctx.beginPath();
				ctx.moveTo(e.x, e.y);
				ctx.lineTo(
					e.x - headLen * Math.cos(angle - Math.PI / 6),
					e.y - headLen * Math.sin(angle - Math.PI / 6)
				);
				ctx.moveTo(e.x, e.y);
				ctx.lineTo(
					e.x - headLen * Math.cos(angle + Math.PI / 6),
					e.y - headLen * Math.sin(angle + Math.PI / 6)
				);
				ctx.stroke();
				break;
			}
		}
	}

	function drawLivePen(): void {
		if (!overlayCanvas || penPoints.length < 2) return;
		const ctx = overlayCanvas.getContext('2d');
		if (!ctx) return;

		ctx.save();
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.strokeStyle = currentColor;
		ctx.lineWidth = strokeThickness * zoom;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();

		const first = pdfToCanvas(penPoints[0]);
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < penPoints.length; i++) {
			const p = pdfToCanvas(penPoints[i]);
			ctx.lineTo(p.x, p.y);
		}
		ctx.stroke();
		ctx.restore();
	}

	function drawLiveSelection(): void {
		if (!overlayCanvas || !selectionStart || !selectionEnd) return;
		const ctx = overlayCanvas.getContext('2d');
		if (!ctx) return;

		ctx.save();
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.strokeStyle = '#3B82F6';
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);

		const x = Math.min(selectionStart.x, selectionEnd.x);
		const y = Math.min(selectionStart.y, selectionEnd.y);
		const w = Math.abs(selectionEnd.x - selectionStart.x);
		const h = Math.abs(selectionEnd.y - selectionStart.y);
		ctx.strokeRect(x, y, w, h);
		ctx.restore();
	}

	function drawLiveShape(point: { x: number; y: number }): void {
		if (!overlayCanvas || !drawStart) return;
		const ctx = overlayCanvas.getContext('2d');
		if (!ctx) return;

		ctx.save();
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.strokeStyle = currentColor;
		ctx.lineWidth = strokeThickness * zoom;

		const shapeType = currentTool as 'rectangle' | 'circle' | 'arrow' | 'line';
		const fakeAnn: ShapeAnnotation = {
			id: '',
			type: 'shape',
			page: currentPage,
			color: currentColor,
			thickness: strokeThickness,
			shapeType,
			start: canvasToPdf(drawStart),
			end: canvasToPdf(point)
		};
		drawShape(ctx, fakeAnn);
		ctx.restore();
	}

	function confirmTextAnnotation(): void {
		if (!pendingTextAnnotation || pendingText.trim() === '') {
			pendingTextAnnotation = null;
			pendingText = '';
			return;
		}
		annotations.add({
			id: crypto.randomUUID(),
			type: 'text',
			page: currentPage,
			color: currentColor,
			content: pendingText.trim(),
			position: { x: pendingTextAnnotation.x, y: pendingTextAnnotation.y },
			fontSize: 14
		});
		pendingTextAnnotation = null;
		pendingText = '';
	}

	function cancelTextAnnotation(): void {
		pendingTextAnnotation = null;
		pendingText = '';
	}

	const pendingTextCanvasPos = $derived(
		pendingTextAnnotation
			? pdfToCanvas(pendingTextAnnotation)
			: null
	);

	function handleTextInputKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault();
			confirmTextAnnotation();
		} else if (e.key === 'Escape') {
			cancelTextAnnotation();
		}
	}

	export async function saveToBlob(): Promise<Blob> {
		const { PDFDocument, rgb } = await import('pdf-lib');
		const buffer = await file.arrayBuffer();
		const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

		for (const ann of annotations.getAll()) {
			const page = doc.getPage(ann.page - 1);
			const { height: pageH } = page.getSize();

			const color = hexToRgb(ann.color);

			switch (ann.type) {
				case 'highlight': {
					for (const r of ann.rects) {
						page.drawRectangle({
							x: r.x,
							y: r.y,
							width: r.width,
							height: r.height,
							color: rgb(color.r, color.g, color.b),
							opacity: 0.3
						});
					}
					break;
				}
				case 'underline': {
					for (const r of ann.rects) {
						page.drawLine({
							start: { x: r.x, y: r.y - 2 },
							end: { x: r.x + r.width, y: r.y - 2 },
							thickness: 2,
							color: rgb(color.r, color.g, color.b)
						});
					}
					break;
				}
				case 'strikethrough': {
					for (const r of ann.rects) {
						page.drawLine({
							start: { x: r.x, y: r.y + r.height / 2 },
							end: { x: r.x + r.width, y: r.y + r.height / 2 },
							thickness: 2,
							color: rgb(color.r, color.g, color.b)
						});
					}
					break;
				}
				case 'pen': {
					for (let i = 1; i < ann.points.length; i++) {
						page.drawLine({
							start: { x: ann.points[i - 1].x, y: ann.points[i - 1].y },
							end: { x: ann.points[i].x, y: ann.points[i].y },
							thickness: ann.thickness,
							color: rgb(color.r, color.g, color.b)
						});
					}
					break;
				}
				case 'shape': {
					const s = ann.start;
					const e = ann.end;
					switch (ann.shapeType) {
						case 'rectangle':
							page.drawRectangle({
								x: Math.min(s.x, e.x),
								y: Math.min(s.y, e.y),
								width: Math.abs(e.x - s.x),
								height: Math.abs(e.y - s.y),
								borderColor: rgb(color.r, color.g, color.b),
								borderWidth: ann.thickness,
								color: undefined
							});
							break;
						case 'circle':
							page.drawEllipse({
								x: (s.x + e.x) / 2,
								y: (s.y + e.y) / 2,
								xScale: Math.abs(e.x - s.x) / 2,
								yScale: Math.abs(e.y - s.y) / 2,
								borderColor: rgb(color.r, color.g, color.b),
								borderWidth: ann.thickness,
								color: undefined
							});
							break;
						case 'line':
						case 'arrow':
							page.drawLine({
								start: s,
								end: e,
								thickness: ann.thickness,
								color: rgb(color.r, color.g, color.b)
							});
							if (ann.shapeType === 'arrow') {
								const angle = Math.atan2(e.y - s.y, e.x - s.x);
								const headLen = 12;
								page.drawLine({
									start: e,
									end: {
										x: e.x - headLen * Math.cos(angle - Math.PI / 6),
										y: e.y - headLen * Math.sin(angle - Math.PI / 6)
									},
									thickness: ann.thickness,
									color: rgb(color.r, color.g, color.b)
								});
								page.drawLine({
									start: e,
									end: {
										x: e.x - headLen * Math.cos(angle + Math.PI / 6),
										y: e.y - headLen * Math.sin(angle + Math.PI / 6)
									},
									thickness: ann.thickness,
									color: rgb(color.r, color.g, color.b)
								});
							}
							break;
					}
					break;
				}
				case 'text': {
					const { StandardFonts } = await import('pdf-lib');
					const font = await doc.embedFont(StandardFonts.Helvetica);
					page.drawText(ann.content, {
						x: ann.position.x,
						y: ann.position.y,
						size: ann.fontSize,
						font,
						color: rgb(color.r, color.g, color.b)
					});
					break;
				}
			}
		}

		const savedBytes = await doc.save();
		return new Blob([savedBytes as BlobPart], { type: 'application/pdf' });
	}

	function hexToRgb(hex: string): { r: number; g: number; b: number } {
		const h = hex.replace('#', '');
		return {
			r: parseInt(h.substring(0, 2), 16) / 255,
			g: parseInt(h.substring(2, 4), 16) / 255,
			b: parseInt(h.substring(4, 6), 16) / 255
		};
	}
</script>

<div bind:this={containerRef} class="relative inline-block">
	<canvas bind:this={pdfCanvas} class="block"></canvas>
	<canvas
		bind:this={overlayCanvas}
		class="absolute top-0 left-0"
		style="width: {canvasWidth}px; height: {canvasHeight}px; cursor: {currentTool === 'eraser' ? 'crosshair' : currentTool === 'text' ? 'text' : 'default'};"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	></canvas>

	{#if pendingTextAnnotation && pendingTextCanvasPos}
		<div
			class="absolute z-10 flex items-center gap-1 rounded border border-blue-400 bg-white shadow-md dark:bg-zinc-900"
			style="left: {pendingTextCanvasPos.x}px; top: {pendingTextCanvasPos.y - 32}px;"
		>
			<input
				type="text"
				bind:value={pendingText}
				onkeydown={handleTextInputKeydown}
				placeholder="Enter text..."
				class="w-40 rounded-l px-2 py-1 text-sm outline-none dark:bg-zinc-900 dark:text-white"
				autofocus
			/>
			<button
				type="button"
				onclick={confirmTextAnnotation}
				class="px-2 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
			>
				OK
			</button>
			<button
				type="button"
				onclick={cancelTextAnnotation}
				class="px-2 py-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
			>
				X
			</button>
		</div>
	{/if}
</div>
