<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import ImageCanvas from '$lib/components/image/ImageCanvas.svelte';
	import CropOverlay from '$lib/components/image/CropOverlay.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Crop,
		RotateCw,
		RotateCcw,
		FlipHorizontal,
		FlipVertical,
		Scaling,
		Link2,
		Unlink2,
		Download,
		ImagePlus,
		Undo2,
		Redo2
	} from '@lucide/svelte';
	import { loadImageBitmap, downloadBlob, exportImage, formatFileSize } from '$lib/utils/image-export';
	import { rotateImage, flipImage, resizeImage, cropImage } from '$lib/utils/image-filters';
	import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_DIMENSION, MIN_IMAGE_DIMENSION } from '$lib/utils/image-types';
	import type { CropRect } from '$lib/utils/image-types';
	import { ImageHistoryStore } from '$lib/stores/image-history.svelte';

	let image = $state<ImageBitmap | null>(null);
	let fileName = $state('');
	let fileSize = $state(0);
	let zoom = $state(1);
	let isCropping = $state(false);
	let panX = $state(0);
	let panY = $state(0);

	// Resize state
	let resizeMode = $state(false);
	let resizeWidth = $state(0);
	let resizeHeight = $state(0);
	let resizeLocked = $state(true);
	let originalAspectRatio = $state(1);

	// History
	const history = new ImageHistoryStore();

	$effect(() => {
		return () => {
			history.cleanup();
		};
	});

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;
		fileName = file.name;
		fileSize = file.size;
		const bitmap = await loadImageBitmap(file);
		image = bitmap;
		history.init(bitmap);
		resetTools();
	}

	function resetTools(): void {
		isCropping = false;
		resizeMode = false;
	}

	function loadAnother(): void {
		image?.close();
		image = null;
		history.cleanup();
		resetTools();
	}

	// Crop
	function startCrop(): void {
		isCropping = true;
		resizeMode = false;
	}

	async function applyCrop(rect: CropRect): Promise<void> {
		if (!image) return;
		const cropped = await cropImage(image, rect.x, rect.y, rect.width, rect.height);
		history.pushState(cropped, 'Crop');
		image = cropped;
		isCropping = false;
	}

	function cancelCrop(): void {
		isCropping = false;
	}

	// Rotate & Flip
	async function handleRotate(deg: 90 | -90 | 180): Promise<void> {
		if (!image) return;
		const rotated = await rotateImage(image, deg);
		const label = deg === 180 ? 'Rotate 180' : deg === 90 ? 'Rotate CW' : 'Rotate CCW';
		history.pushState(rotated, label);
		image = rotated;
	}

	async function handleFlip(dir: 'horizontal' | 'vertical'): Promise<void> {
		if (!image) return;
		const flipped = await flipImage(image, dir);
		history.pushState(flipped, dir === 'horizontal' ? 'Flip H' : 'Flip V');
		image = flipped;
	}

	// Resize
	function startResize(): void {
		if (!image) return;
		resizeMode = true;
		isCropping = false;
		resizeWidth = image.width;
		resizeHeight = image.height;
		originalAspectRatio = image.width / image.height;
	}

	function onResizeWidthInput(): void {
		if (resizeLocked) {
			resizeHeight = Math.round(resizeWidth / originalAspectRatio);
		}
	}

	function onResizeHeightInput(): void {
		if (resizeLocked) {
			resizeWidth = Math.round(resizeHeight * originalAspectRatio);
		}
	}

	async function applyResize(): Promise<void> {
		if (!image) return;
		const w = Math.max(MIN_IMAGE_DIMENSION, Math.min(MAX_IMAGE_DIMENSION, resizeWidth));
		const h = Math.max(MIN_IMAGE_DIMENSION, Math.min(MAX_IMAGE_DIMENSION, resizeHeight));
		const resized = await resizeImage(image, w, h);
		history.pushState(resized, `Resize ${w}x${h}`);
		image = resized;
		resizeMode = false;
	}

	// Quick resize percentages
	async function resizeByPercent(pct: number): Promise<void> {
		if (!image) return;
		const w = Math.round(image.width * pct / 100);
		const h = Math.round(image.height * pct / 100);
		const resized = await resizeImage(image, w, h);
		history.pushState(resized, `Resize ${pct}%`);
		image = resized;
		resizeMode = false;
	}

	// Undo / Redo
	function handleUndo(): void {
		const state = history.undo();
		if (state) image = state.image;
	}

	function handleRedo(): void {
		const state = history.redo();
		if (state) image = state.image;
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			handleUndo();
		} else if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
			e.preventDefault();
			handleRedo();
		} else if (e.key === 'Escape' && isCropping) {
			cancelCrop();
		}
	}

	// Download
	async function handleDownload(): Promise<void> {
		if (!image) return;
		const canvas = new OffscreenCanvas(image.width, image.height);
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(image, 0, 0);
		const blob = await exportImage(canvas, 'image/png', 1);
		const baseName = fileName.replace(/\.[^.]+$/, '') || 'edited';
		downloadBlob(blob, `${baseName}-edited.png`);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<ToolHeader
	title="Edit Image"
	description="Crop, rotate, flip, and resize images"
/>

{#if !image}
	<FileDropzone
		accept={ACCEPTED_IMAGE_TYPES}
		onFiles={handleFiles}
	/>
{:else}
	<div class="flex flex-col gap-4 lg:flex-row" style="min-height: 400px;">
		<!-- Canvas area -->
		<div class="relative h-[50vh] overflow-hidden rounded-lg border lg:h-auto lg:flex-1" style="min-height: 250px;">
			<ImageCanvas {image} bind:zoom bind:panX bind:panY />
			{#if isCropping}
				<CropOverlay
					imageWidth={image.width}
					imageHeight={image.height}
					{zoom}
					{panX}
					{panY}
					onCrop={applyCrop}
					onCancel={cancelCrop}
				/>
			{/if}
		</div>

		<!-- Controls panel -->
		<div class="w-full space-y-4 lg:w-72 lg:shrink-0 lg:overflow-y-auto">
			<!-- Undo/Redo & Load another -->
			<div class="flex items-center gap-2">
				<Button variant="outline" size="icon" class="size-8" onclick={handleUndo} disabled={!history.canUndo} title={history.canUndo ? `Undo: ${history.undoLabel}` : 'Nothing to undo'}>
					<Undo2 class="size-4" />
				</Button>
				<Button variant="outline" size="icon" class="size-8" onclick={handleRedo} disabled={!history.canRedo} title={history.canRedo ? `Redo: ${history.redoLabel}` : 'Nothing to redo'}>
					<Redo2 class="size-4" />
				</Button>
				<div class="flex-1"></div>
				<Button variant="ghost" size="sm" onclick={loadAnother}>
					<ImagePlus class="mr-1 size-4" /> New
				</Button>
			</div>

			<!-- Transform tools -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-sm">Transform</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" onclick={startCrop} class={isCropping ? 'ring-2 ring-primary' : ''}>
							<Crop class="mr-1 size-4" /> Crop
						</Button>
						<Button variant="outline" size="sm" onclick={startResize} class={resizeMode ? 'ring-2 ring-primary' : ''}>
							<Scaling class="mr-1 size-4" /> Resize
						</Button>
					</div>

					<Separator />

					<div class="flex flex-wrap gap-2">
						<Button variant="outline" size="icon" class="size-8" onclick={() => handleRotate(-90)} title="Rotate CCW">
							<RotateCcw class="size-4" />
						</Button>
						<Button variant="outline" size="icon" class="size-8" onclick={() => handleRotate(90)} title="Rotate CW">
							<RotateCw class="size-4" />
						</Button>
						<Button variant="outline" size="icon" class="size-8" onclick={() => handleFlip('horizontal')} title="Flip Horizontal">
							<FlipHorizontal class="size-4" />
						</Button>
						<Button variant="outline" size="icon" class="size-8" onclick={() => handleFlip('vertical')} title="Flip Vertical">
							<FlipVertical class="size-4" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Resize panel -->
			{#if resizeMode}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="text-sm">Resize</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="text-muted-foreground text-xs">
							Original: {image.width} x {image.height}
						</div>

						<div class="flex items-end gap-2">
							<div class="flex-1">
								<Label class="text-xs">Width</Label>
								<Input
									type="number"
									bind:value={resizeWidth}
									min={MIN_IMAGE_DIMENSION}
									max={MAX_IMAGE_DIMENSION}
									oninput={onResizeWidthInput}
									class="h-8"
								/>
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="size-8 shrink-0"
								onclick={() => { resizeLocked = !resizeLocked; }}
								title={resizeLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
							>
								{#if resizeLocked}
									<Link2 class="size-4" />
								{:else}
									<Unlink2 class="size-4" />
								{/if}
							</Button>
							<div class="flex-1">
								<Label class="text-xs">Height</Label>
								<Input
									type="number"
									bind:value={resizeHeight}
									min={MIN_IMAGE_DIMENSION}
									max={MAX_IMAGE_DIMENSION}
									oninput={onResizeHeightInput}
									class="h-8"
								/>
							</div>
						</div>

						<div class="flex flex-wrap gap-1">
							{#each [25, 50, 75, 150, 200] as pct}
								<Button variant="outline" size="sm" class="h-7 text-xs" onclick={() => resizeByPercent(pct)}>
									{pct}%
								</Button>
							{/each}
						</div>

						<div class="flex gap-2">
							<Button size="sm" onclick={applyResize} class="flex-1">Apply</Button>
							<Button size="sm" variant="outline" onclick={() => { resizeMode = false; }}>Cancel</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Download -->
			<Button class="w-full" onclick={handleDownload}>
				<Download class="mr-2 size-4" /> Download
			</Button>

			<!-- Image info -->
			<div class="text-muted-foreground hidden space-y-1 text-xs lg:block">
				<div>File: {fileName}</div>
				<div>Size: {formatFileSize(fileSize)}</div>
				<div>Dimensions: {image.width} x {image.height}</div>
			</div>
		</div>
	</div>
{/if}
