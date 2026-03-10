<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Copy, ImagePlus, Crosshair } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { loadImageBitmap, formatFileSize } from '$lib/utils/image-export';
	import { rgbToHex, rgbToHsl } from '$lib/utils/image-filters';
	import { ACCEPTED_IMAGE_TYPES } from '$lib/utils/image-types';

	let image = $state<ImageBitmap | null>(null);
	let fileName = $state('');
	let canvasRef = $state<HTMLCanvasElement | null>(null);
	let loupeCanvasRef = $state<HTMLCanvasElement | null>(null);

	let pickedColor = $state<[number, number, number] | null>(null);
	let colorHistory = $state<[number, number, number][]>([]);
	let hasEyeDropper = 'EyeDropper' in window;
	let showLoupe = $state(false);
	let loupeX = $state(0);
	let loupeY = $state(0);

	$effect(() => {
		return () => {
			image?.close();
		};
	});

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;
		fileName = file.name;
		image = await loadImageBitmap(file);
		pickedColor = null;
		colorHistory = [];
	}

	function loadAnother(): void {
		image?.close();
		image = null;
		pickedColor = null;
		colorHistory = [];
	}

	$effect(() => {
		if (!canvasRef || !image) return;
		const maxW = canvasRef.parentElement?.clientWidth ?? 800;
		const maxH = canvasRef.parentElement?.clientHeight ?? 600;
		const scale = Math.min(1, maxW / image.width, maxH / image.height);

		canvasRef.width = image.width;
		canvasRef.height = image.height;
		canvasRef.style.width = `${image.width * scale}px`;
		canvasRef.style.height = `${image.height * scale}px`;

		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;
		ctx.drawImage(image, 0, 0);
	});

	function getPixelColor(e: MouseEvent): [number, number, number] | null {
		if (!canvasRef || !image) return null;
		const rect = canvasRef.getBoundingClientRect();
		const scaleX = image.width / rect.width;
		const scaleY = image.height / rect.height;
		const x = Math.floor((e.clientX - rect.left) * scaleX);
		const y = Math.floor((e.clientY - rect.top) * scaleY);
		if (x < 0 || y < 0 || x >= image.width || y >= image.height) return null;

		const ctx = canvasRef.getContext('2d');
		if (!ctx) return null;
		const pixel = ctx.getImageData(x, y, 1, 1).data;
		return [pixel[0], pixel[1], pixel[2]];
	}

	function handleCanvasClick(e: MouseEvent): void {
		const color = getPixelColor(e);
		if (!color) return;
		pickedColor = color;
		// Add to history (max 10, no duplicates at head)
		const hex = rgbToHex(...color);
		const existing = colorHistory.findIndex((c) => rgbToHex(...c) === hex);
		if (existing === 0) return;
		if (existing > 0) {
			colorHistory = [color, ...colorHistory.filter((_, i) => i !== existing)];
		} else {
			colorHistory = [color, ...colorHistory.slice(0, 9)];
		}
	}

	function handleCanvasMove(e: MouseEvent): void {
		if (!canvasRef || !image || !loupeCanvasRef) return;
		const rect = canvasRef.getBoundingClientRect();
		loupeX = e.clientX - rect.left + 20;
		loupeY = e.clientY - rect.top - 80;
		showLoupe = true;

		const scaleX = image.width / rect.width;
		const scaleY = image.height / rect.height;
		const imgX = Math.floor((e.clientX - rect.left) * scaleX);
		const imgY = Math.floor((e.clientY - rect.top) * scaleY);

		// Draw loupe (20x20 region zoomed 8x)
		const loupeCtx = loupeCanvasRef.getContext('2d');
		const mainCtx = canvasRef.getContext('2d');
		if (!loupeCtx || !mainCtx) return;

		const region = 10;
		const loupeSize = 160;
		loupeCanvasRef.width = loupeSize;
		loupeCanvasRef.height = loupeSize;
		loupeCtx.imageSmoothingEnabled = false;

		const sx = Math.max(0, imgX - region);
		const sy = Math.max(0, imgY - region);
		const sw = Math.min(region * 2, image.width - sx);
		const sh = Math.min(region * 2, image.height - sy);

		loupeCtx.clearRect(0, 0, loupeSize, loupeSize);
		loupeCtx.drawImage(canvasRef, sx, sy, sw, sh, 0, 0, loupeSize, loupeSize);

		// Crosshair
		loupeCtx.strokeStyle = 'rgba(255,255,255,0.8)';
		loupeCtx.lineWidth = 1;
		loupeCtx.beginPath();
		loupeCtx.moveTo(loupeSize / 2, 0);
		loupeCtx.lineTo(loupeSize / 2, loupeSize);
		loupeCtx.moveTo(0, loupeSize / 2);
		loupeCtx.lineTo(loupeSize, loupeSize / 2);
		loupeCtx.stroke();
	}

	function handleCanvasLeave(): void {
		showLoupe = false;
	}

	async function copyToClipboard(text: string): Promise<void> {
		await navigator.clipboard.writeText(text);
		toast('Copied!');
	}

	async function pickFromScreen(): Promise<void> {
		if (!hasEyeDropper) return;
		try {
			// @ts-expect-error EyeDropper API not in all TS libs
			const dropper = new EyeDropper();
			const result = await dropper.open();
			const hex = result.sRGBHex as string;
			// Parse hex to RGB
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			pickedColor = [r, g, b];
			colorHistory = [[r, g, b], ...colorHistory.slice(0, 9)];
		} catch {
			// User cancelled
		}
	}

	function selectFromHistory(color: [number, number, number]): void {
		pickedColor = color;
	}

	let hex = $derived(pickedColor ? rgbToHex(...pickedColor) : null);
	let rgb = $derived(pickedColor ? `rgb(${pickedColor.join(', ')})` : null);
	let hsl = $derived.by(() => {
		if (!pickedColor) return null;
		const [h, s, l] = rgbToHsl(...pickedColor);
		return `hsl(${h}, ${s}%, ${l}%)`;
	});
</script>

<ToolHeader
	title="Color Picker"
	description="Pick colors from any image"
/>

{#if !image}
	<FileDropzone accept={ACCEPTED_IMAGE_TYPES} onFiles={handleFiles} />
{:else}
	<div class="flex flex-col gap-4 lg:flex-row" style="min-height: 400px;">
		<!-- Canvas -->
		<div class="relative h-[50vh] overflow-auto rounded-lg border lg:h-auto lg:flex-1" style="min-height: 250px;">
			<div class="flex h-full items-center justify-center bg-black/5 p-2 sm:p-4">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<canvas
					bind:this={canvasRef}
					class="cursor-crosshair"
					onclick={handleCanvasClick}
					onmousemove={handleCanvasMove}
					onmouseleave={handleCanvasLeave}
				></canvas>
			</div>

			<!-- Magnifying loupe -->
			{#if showLoupe}
				<div
					class="pointer-events-none absolute overflow-hidden rounded-full border-2 border-white shadow-lg"
					style="left: {loupeX}px; top: {loupeY}px; width: 160px; height: 160px;"
				>
					<canvas bind:this={loupeCanvasRef} class="size-full"></canvas>
				</div>
			{/if}
		</div>

		<!-- Color info panel -->
		<div class="w-full space-y-4 lg:w-72 lg:shrink-0 lg:overflow-y-auto">
			<div class="flex flex-wrap items-center gap-2">
				<Crosshair class="text-muted-foreground size-4" />
				<span class="text-sm font-medium">Click the image to pick a color</span>
				<div class="flex-1"></div>
				<Button variant="ghost" size="sm" onclick={loadAnother}>
					<ImagePlus class="mr-1 size-4" /> New
				</Button>
			</div>

			{#if hasEyeDropper}
				<Button variant="outline" class="w-full" onclick={pickFromScreen}>
					<Crosshair class="mr-2 size-4" /> Pick from Screen
				</Button>
			{/if}

			{#if pickedColor}
				<!-- Color swatch -->
				<Card.Root>
					<Card.Content class="space-y-3 pt-6">
						<div
							class="h-20 w-full rounded-lg border"
							style="background-color: {hex};"
						></div>

						<!-- Color formats -->
						{#each [
							{ label: 'HEX', value: hex },
							{ label: 'RGB', value: rgb },
							{ label: 'HSL', value: hsl }
						] as fmt}
							{#if fmt.value}
								<div class="flex items-center justify-between">
									<div>
										<span class="text-muted-foreground text-xs">{fmt.label}</span>
										<p class="font-mono text-sm">{fmt.value}</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										class="size-8"
										onclick={() => copyToClipboard(fmt.value!)}
									>
										<Copy class="size-4" />
									</Button>
								</div>
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Color history -->
			{#if colorHistory.length > 0}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="text-sm">Color History</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-2">
							{#each colorHistory as color, i}
								{@const colorHex = rgbToHex(...color)}
								<button
									class="size-8 rounded-lg border transition-transform hover:scale-110 {pickedColor && rgbToHex(...pickedColor) === colorHex ? 'ring-primary ring-2' : ''}"
									style="background-color: {colorHex};"
									onclick={() => selectFromHistory(color)}
									title={colorHex}
								></button>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
{/if}
