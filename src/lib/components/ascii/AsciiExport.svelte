<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Copy, Check, Download, ImageIcon } from '@lucide/svelte';
	import { downloadTxt, renderAsciiToPng, downloadPng } from '$lib/utils/ascii-convert';

	interface Props {
		output: string;
	}

	let { output }: Props = $props();

	let copied = $state(false);

	async function handleCopy(): Promise<void> {
		if (!output) return;
		await navigator.clipboard.writeText(output);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function handleDownloadTxt(): void {
		if (!output) return;
		downloadTxt(output, 'ascii-art.txt');
	}

	function handleDownloadPng(): void {
		if (!output) return;
		const dataUrl = renderAsciiToPng(output);
		downloadPng(dataUrl, 'ascii-art.png');
	}
</script>

<div class="flex flex-wrap gap-2">
	<Button variant="outline" size="sm" disabled={!output} onclick={handleCopy}>
		{#if copied}
			<Check class="size-4" />
			Copied
		{:else}
			<Copy class="size-4" />
			Copy
		{/if}
	</Button>
	<Button variant="outline" size="sm" disabled={!output} onclick={handleDownloadTxt}>
		<Download class="size-4" />
		Download TXT
	</Button>
	<Button variant="outline" size="sm" disabled={!output} onclick={handleDownloadPng}>
		<ImageIcon class="size-4" />
		Download PNG
	</Button>
</div>
