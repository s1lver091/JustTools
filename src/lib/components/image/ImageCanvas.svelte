<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Maximize, ZoomIn, ZoomOut, Square } from '@lucide/svelte';

	interface Props {
		image: ImageBitmap;
		zoom?: number;
		panX?: number;
		panY?: number;
		onZoomChange?: (zoom: number) => void;
	}

	let { image, zoom = $bindable(1), panX = $bindable(0), panY = $bindable(0), onZoomChange }: Props = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let canvasRef = $state<HTMLCanvasElement | null>(null);
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	let isPanning = $state(false);
	let panStartX = 0;
	let panStartY = 0;
	let panStartPanX = 0;
	let panStartPanY = 0;

	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 10;

	function fitToWindow(): void {
		if (!containerWidth || !containerHeight || !image) return;
		const scaleX = containerWidth / image.width;
		const scaleY = containerHeight / image.height;
		zoom = Math.min(scaleX, scaleY, 1);
		const displayW = image.width * zoom;
		const displayH = image.height * zoom;
		panX = (containerWidth - displayW) / 2;
		panY = (containerHeight - displayH) / 2;
		onZoomChange?.(zoom);
	}

	function actualSize(): void {
		if (!containerWidth || !containerHeight || !image) return;
		zoom = 1;
		const displayW = image.width;
		const displayH = image.height;
		panX = (containerWidth - displayW) / 2;
		panY = (containerHeight - displayH) / 2;
		onZoomChange?.(zoom);
	}

	function clampZoom(z: number): number {
		return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
	}

	function handleWheel(e: WheelEvent): void {
		e.preventDefault();
		const factor = e.deltaY < 0 ? 1.1 : 0.9;
		const newZoom = clampZoom(zoom * factor);

		if (containerRef) {
			const rect = containerRef.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const worldX = (mouseX - panX) / zoom;
			const worldY = (mouseY - panY) / zoom;

			panX = mouseX - worldX * newZoom;
			panY = mouseY - worldY * newZoom;
		}

		zoom = newZoom;
		onZoomChange?.(zoom);
	}

	function handlePointerDown(e: PointerEvent): void {
		if (e.button !== 0) return;
		isPanning = true;
		panStartX = e.clientX;
		panStartY = e.clientY;
		panStartPanX = panX;
		panStartPanY = panY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent): void {
		if (!isPanning) return;
		panX = panStartPanX + (e.clientX - panStartX);
		panY = panStartPanY + (e.clientY - panStartY);
	}

	function handlePointerUp(): void {
		isPanning = false;
	}

	$effect(() => {
		if (!canvasRef || !image) return;
		const dpr = window.devicePixelRatio || 1;
		const displayW = image.width * zoom;
		const displayH = image.height * zoom;

		canvasRef.style.width = `${displayW}px`;
		canvasRef.style.height = `${displayH}px`;
		canvasRef.width = displayW * dpr;
		canvasRef.height = displayH * dpr;

		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, displayW, displayH);
		ctx.drawImage(image, 0, 0, displayW, displayH);
	});

	let lastImageRef: ImageBitmap | null = null;

	$effect(() => {
		if (image && containerWidth && containerHeight && image !== lastImageRef) {
			lastImageRef = image;
			fitToWindow();
		}
	});
</script>

<div class="flex h-full flex-col">
	<div
		class="relative flex-1 overflow-hidden"
		bind:this={containerRef}
		bind:clientWidth={containerWidth}
		bind:clientHeight={containerHeight}
		onwheel={handleWheel}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		role="application"
		aria-label="Image canvas"
		style="cursor: {isPanning ? 'grabbing' : 'grab'}"
	>
		<div
			class="absolute"
			style="left: {panX}px; top: {panY}px; transform-origin: 0 0;"
		>
			<canvas bind:this={canvasRef}></canvas>
		</div>
	</div>
	<div class="bg-muted/50 flex items-center justify-between border-t px-3 py-1.5 text-xs">
		<div class="text-muted-foreground flex items-center gap-3">
			<span>{image.width} x {image.height}px</span>
			<span>{Math.round(zoom * 100)}%</span>
		</div>
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="icon" class="size-6" onclick={() => { zoom = clampZoom(zoom * 0.8); onZoomChange?.(zoom); }}>
				<ZoomOut class="size-3.5" />
			</Button>
			<Button variant="ghost" size="icon" class="size-6" onclick={() => { zoom = clampZoom(zoom * 1.25); onZoomChange?.(zoom); }}>
				<ZoomIn class="size-3.5" />
			</Button>
			<Button variant="ghost" size="icon" class="size-6" onclick={fitToWindow} title="Fit to window">
				<Maximize class="size-3.5" />
			</Button>
			<Button variant="ghost" size="icon" class="size-6" onclick={actualSize} title="100%">
				<Square class="size-3.5" />
			</Button>
		</div>
	</div>
</div>
