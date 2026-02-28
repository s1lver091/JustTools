<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Download, Copy, Check, ImageIcon, FileCode } from '@lucide/svelte';

	interface Props {
		canvasEl?: HTMLCanvasElement | null;
		svgEl?: SVGSVGElement | null;
		mode: 'canvas' | 'svg';
		filename?: string;
		hasContent: boolean;
		children: Snippet;
		onDownloadPng?: () => Promise<void>;
	}

	let { canvasEl = null, svgEl = null, mode, filename = 'code', hasContent, children, onDownloadPng }: Props = $props();

	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	async function downloadPng() {
		if (onDownloadPng) {
			await onDownloadPng();
			return;
		}
		const canvas = mode === 'canvas' ? canvasEl : svgToCanvas();
		if (!canvas) return;

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob((b) => resolve(b), 'image/png')
		);
		if (!blob) return;

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${filename}-${Date.now()}.png`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function svgToCanvas(): HTMLCanvasElement | null {
		if (!svgEl) return null;
		const canvas = document.createElement('canvas');
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgEl);
		const img = new Image();
		const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		return new Promise<HTMLCanvasElement | null>((resolve) => {
			img.onload = () => {
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					ctx.drawImage(img, 0, 0);
				}
				URL.revokeObjectURL(url);
				resolve(canvas);
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			img.src = url;
		}) as unknown as HTMLCanvasElement;
	}

	async function downloadSvg() {
		let svgString: string;
		if (mode === 'svg' && svgEl) {
			const serializer = new XMLSerializer();
			svgString = serializer.serializeToString(svgEl);
		} else if (mode === 'canvas' && canvasEl) {
			svgString = canvasToSvgFallback(canvasEl);
		} else {
			return;
		}

		const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${filename}-${Date.now()}.svg`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function canvasToSvgFallback(canvas: HTMLCanvasElement): string {
		const dataUrl = canvas.toDataURL('image/png');
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
	<image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" />
</svg>`;
	}

	async function copyToClipboard() {
		try {
			let blob: Blob | null = null;

			if (mode === 'canvas' && canvasEl) {
				blob = await new Promise<Blob | null>((resolve) =>
					canvasEl!.toBlob((b) => resolve(b), 'image/png')
				);
			} else if (mode === 'svg' && svgEl) {
				const canvas = await svgToCanvasAsync();
				if (canvas) {
					blob = await new Promise<Blob | null>((resolve) =>
						canvas.toBlob((b) => resolve(b), 'image/png')
					);
				}
			}

			if (blob) {
				await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
				copied = true;
				clearTimeout(copyTimeout);
				copyTimeout = setTimeout(() => {
					copied = false;
				}, 2000);
			}
		} catch {
			// Fallback: copy data URL as text
			if (mode === 'canvas' && canvasEl) {
				const dataUrl = canvasEl.toDataURL('image/png');
				await navigator.clipboard.writeText(dataUrl);
				copied = true;
				clearTimeout(copyTimeout);
				copyTimeout = setTimeout(() => {
					copied = false;
				}, 2000);
			}
		}
	}

	async function svgToCanvasAsync(): Promise<HTMLCanvasElement | null> {
		if (!svgEl) return null;
		const canvas = document.createElement('canvas');
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgEl);
		const img = new Image();
		const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		return new Promise<HTMLCanvasElement | null>((resolve) => {
			img.onload = () => {
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					ctx.drawImage(img, 0, 0);
				}
				URL.revokeObjectURL(url);
				resolve(canvas);
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			img.src = url;
		});
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div
		class="border-border bg-background flex min-h-[200px] items-center justify-center rounded-lg border p-4"
	>
		{#if hasContent}
			{@render children()}
		{:else}
			<p class="text-muted-foreground text-sm">Enter content to generate a code</p>
		{/if}
	</div>

	{#if hasContent}
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" size="sm" onclick={downloadPng} disabled={!hasContent}>
				<ImageIcon class="mr-1.5 size-4" />
				Download PNG
			</Button>
			<Button variant="outline" size="sm" onclick={downloadSvg} disabled={!hasContent}>
				<FileCode class="mr-1.5 size-4" />
				Download SVG
			</Button>
			<Button variant="outline" size="sm" onclick={copyToClipboard} disabled={!hasContent}>
				{#if copied}
					<Check class="mr-1.5 size-4" />
					Copied
				{:else}
					<Copy class="mr-1.5 size-4" />
					Copy
				{/if}
			</Button>
		</div>
	{/if}
</div>
