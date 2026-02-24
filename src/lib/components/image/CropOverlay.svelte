<script lang="ts">
	import type { CropRect } from '$lib/utils/image-types';
	import { Button } from '$lib/components/ui/button';
	import { Check, X } from '@lucide/svelte';

	interface Props {
		imageWidth: number;
		imageHeight: number;
		zoom: number;
		panX: number;
		panY: number;
		onCrop: (rect: CropRect) => void;
		onCancel: () => void;
	}

	let { imageWidth, imageHeight, zoom, panX, panY, onCrop, onCancel }: Props = $props();

	const MIN_CROP = 10;
	let cropX = $state(0);
	let cropY = $state(0);
	let cropW = $state(0);
	let cropH = $state(0);
	let dragging = $state<string | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartCropX = 0;
	let dragStartCropY = 0;
	let dragStartCropW = 0;
	let dragStartCropH = 0;

	// Initialize crop to full image
	$effect(() => {
		cropX = 0;
		cropY = 0;
		cropW = imageWidth;
		cropH = imageHeight;
	});

	// Screen coordinates
	let sx = $derived(cropX * zoom + panX);
	let sy = $derived(cropY * zoom + panY);
	let sw = $derived(cropW * zoom);
	let sh = $derived(cropH * zoom);

	function clampCrop(): void {
		cropX = Math.max(0, Math.min(cropX, imageWidth - MIN_CROP));
		cropY = Math.max(0, Math.min(cropY, imageHeight - MIN_CROP));
		cropW = Math.max(MIN_CROP, Math.min(cropW, imageWidth - cropX));
		cropH = Math.max(MIN_CROP, Math.min(cropH, imageHeight - cropY));
	}

	function handlePointerDown(e: PointerEvent, handle: string): void {
		e.stopPropagation();
		e.preventDefault();
		dragging = handle;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragStartCropX = cropX;
		dragStartCropY = cropY;
		dragStartCropW = cropW;
		dragStartCropH = cropH;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent): void {
		if (!dragging) return;
		const dx = (e.clientX - dragStartX) / zoom;
		const dy = (e.clientY - dragStartY) / zoom;

		if (dragging === 'move') {
			cropX = Math.max(0, Math.min(dragStartCropX + dx, imageWidth - dragStartCropW));
			cropY = Math.max(0, Math.min(dragStartCropY + dy, imageHeight - dragStartCropH));
		} else {
			if (dragging.includes('w')) {
				const newX = dragStartCropX + dx;
				const maxX = dragStartCropX + dragStartCropW - MIN_CROP;
				cropX = Math.max(0, Math.min(newX, maxX));
				cropW = dragStartCropW - (cropX - dragStartCropX);
			}
			if (dragging.includes('e')) {
				cropW = Math.max(MIN_CROP, Math.min(dragStartCropW + dx, imageWidth - dragStartCropX));
			}
			if (dragging.includes('n')) {
				const newY = dragStartCropY + dy;
				const maxY = dragStartCropY + dragStartCropH - MIN_CROP;
				cropY = Math.max(0, Math.min(newY, maxY));
				cropH = dragStartCropH - (cropY - dragStartCropY);
			}
			if (dragging.includes('s')) {
				cropH = Math.max(MIN_CROP, Math.min(dragStartCropH + dy, imageHeight - dragStartCropY));
			}
		}
		clampCrop();
	}

	function handlePointerUp(): void {
		dragging = null;
	}

	function applyCrop(): void {
		onCrop({
			x: Math.round(cropX),
			y: Math.round(cropY),
			width: Math.round(cropW),
			height: Math.round(cropH)
		});
	}

	const handles = [
		{ id: 'nw', cursor: 'nw-resize', dx: 0, dy: 0 },
		{ id: 'n', cursor: 'n-resize', dx: 0.5, dy: 0 },
		{ id: 'ne', cursor: 'ne-resize', dx: 1, dy: 0 },
		{ id: 'w', cursor: 'w-resize', dx: 0, dy: 0.5 },
		{ id: 'e', cursor: 'e-resize', dx: 1, dy: 0.5 },
		{ id: 'sw', cursor: 'sw-resize', dx: 0, dy: 1 },
		{ id: 's', cursor: 's-resize', dx: 0.5, dy: 1 },
		{ id: 'se', cursor: 'se-resize', dx: 1, dy: 1 }
	];
</script>

<svelte:window onpointermove={handlePointerMove} onpointerup={handlePointerUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="pointer-events-none absolute inset-0">
	<!-- Dimming overlays -->
	<div class="pointer-events-none absolute bg-black/50" style="left: 0; top: 0; width: {sx}px; height: 100%;"></div>
	<div class="pointer-events-none absolute bg-black/50" style="left: {sx + sw}px; top: 0; right: 0; height: 100%;"></div>
	<div class="pointer-events-none absolute bg-black/50" style="left: {sx}px; top: 0; width: {sw}px; height: {sy}px;"></div>
	<div class="pointer-events-none absolute bg-black/50" style="left: {sx}px; top: {sy + sh}px; width: {sw}px; bottom: 0;"></div>

	<!-- Crop area -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="pointer-events-auto absolute border-2 border-white"
		style="left: {sx}px; top: {sy}px; width: {sw}px; height: {sh}px; cursor: move;"
		onpointerdown={(e) => handlePointerDown(e, 'move')}
	>
		<!-- Rule of thirds grid -->
		<div class="absolute inset-0">
			<div class="absolute left-1/3 top-0 h-full w-px bg-white/30"></div>
			<div class="absolute left-2/3 top-0 h-full w-px bg-white/30"></div>
			<div class="absolute left-0 top-1/3 h-px w-full bg-white/30"></div>
			<div class="absolute left-0 top-2/3 h-px w-full bg-white/30"></div>
		</div>

		<!-- Resize handles -->
		{#each handles as handle (handle.id)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="pointer-events-auto absolute size-3 border-2 border-white bg-white/80"
				style="
					left: {handle.dx * 100}%;
					top: {handle.dy * 100}%;
					transform: translate(-50%, -50%);
					cursor: {handle.cursor};
				"
				onpointerdown={(e) => handlePointerDown(e, handle.id)}
			></div>
		{/each}
	</div>

	<!-- Crop info & buttons -->
	<div
		class="pointer-events-auto absolute flex items-center gap-2"
		style="left: {sx}px; top: {sy + sh + 8}px;"
	>
		<span class="rounded bg-black/70 px-2 py-1 text-xs text-white">
			{Math.round(cropW)} x {Math.round(cropH)}
		</span>
		<Button size="sm" variant="default" class="h-7" onclick={applyCrop}>
			<Check class="mr-1 size-3.5" /> Apply
		</Button>
		<Button size="sm" variant="outline" class="h-7" onclick={onCancel}>
			<X class="mr-1 size-3.5" /> Cancel
		</Button>
	</div>
</div>
