<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Printer, Download, Loader2, QrCode, Barcode } from '@lucide/svelte';
	import { type BarcodeFormat, BARCODE_FORMATS, BARCODE_FORMAT_GROUPS } from '$lib/utils/qr-helpers';

	type BatchMode = 'qr' | 'barcode';

	let batchMode = $state<BatchMode>('qr');
	let barcodeFormat = $state<BarcodeFormat>('CODE128');
	let textInput = $state('');
	let generating = $state(false);
	let generatedCodes = $state<{ text: string; dataUrl: string }[]>([]);

	const formatInfo = $derived(BARCODE_FORMATS.find((f) => f.value === barcodeFormat));
	const lines = $derived(
		textInput
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0)
	);
	const lineCount = $derived(lines.length);

	function handleModeChange(value: string | undefined) {
		if (value) batchMode = value as BatchMode;
		generatedCodes = [];
	}

	function handleFormatChange(value: string | undefined) {
		if (value) barcodeFormat = value as BarcodeFormat;
		generatedCodes = [];
	}

	async function generateAll() {
		if (lines.length === 0) return;
		generating = true;
		generatedCodes = [];

		const results: { text: string; dataUrl: string }[] = [];

		if (batchMode === 'qr') {
			const QRCode = await import('qrcode');
			for (const line of lines) {
				try {
					const dataUrl = await QRCode.toDataURL(line, {
						width: 300,
						margin: 4,
						errorCorrectionLevel: 'M'
					});
					results.push({ text: line, dataUrl });
				} catch {
					results.push({ text: line, dataUrl: '' });
				}
			}
		} else {
			const JsBarcode = (await import('jsbarcode')).default;
			for (const line of lines) {
				try {
					const canvas = document.createElement('canvas');
					JsBarcode(canvas, line, {
						format: barcodeFormat,
						width: 2,
						height: 100,
						displayValue: true,
						margin: 10
					});
					results.push({ text: line, dataUrl: canvas.toDataURL('image/png') });
				} catch {
					results.push({ text: line, dataUrl: '' });
				}
			}
		}

		generatedCodes = results;
		generating = false;
	}

	function printSheet() {
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		const codesHtml = generatedCodes
			.filter((c) => c.dataUrl)
			.map(
				(c) => `
				<div style="display:inline-block;margin:16px;text-align:center;">
					<img src="${c.dataUrl}" style="max-width:250px;max-height:250px;" alt="${c.text}" />
					<p style="margin-top:4px;font-size:12px;font-family:monospace;word-break:break-all;">${c.text}</p>
				</div>`
			)
			.join('');

		printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
	<title>Batch Codes - Print</title>
	<style>
		body { font-family: sans-serif; padding: 20px; }
		@media print {
			body { padding: 0; }
			button { display: none !important; }
		}
	</style>
</head>
<body>
	<div style="display:flex;flex-wrap:wrap;justify-content:center;">${codesHtml}</div>
	<script>window.print();<\/script>
</body>
</html>`);
		printWindow.document.close();
	}

	async function downloadAll() {
		for (const code of generatedCodes) {
			if (!code.dataUrl) continue;
			const a = document.createElement('a');
			a.href = code.dataUrl;
			const safeName = code.text.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
			a.download = `${batchMode}-${safeName}-${Date.now()}.png`;
			a.click();
			// Small delay to avoid browser blocking multiple downloads
			await new Promise((r) => setTimeout(r, 100));
		}
	}
</script>

<div class="space-y-4">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<!-- Mode -->
		<div class="space-y-2">
			<Label>Type</Label>
			<Select.Root type="single" value={batchMode} onValueChange={handleModeChange}>
				<Select.Trigger class="w-full">
					{#if batchMode === 'qr'}
						<span class="flex items-center gap-2"><QrCode class="size-4" /> QR Codes</span>
					{:else}
						<span class="flex items-center gap-2"><Barcode class="size-4" /> Barcodes</span>
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="qr">QR Codes</Select.Item>
					<Select.Item value="barcode">Barcodes</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Barcode format, only when barcode mode -->
		{#if batchMode === 'barcode'}
			<div class="space-y-2">
				<Label>Barcode Format</Label>
				<Select.Root type="single" value={barcodeFormat} onValueChange={handleFormatChange}>
					<Select.Trigger class="w-full">
						{formatInfo?.label ?? 'Select format'}
					</Select.Trigger>
					<Select.Content>
						{#each BARCODE_FORMAT_GROUPS as group (group.label)}
							<Select.Group>
								<Select.GroupHeading>{group.label}</Select.GroupHeading>
								{#each group.formats as fmt (fmt)}
									{@const fmtInfo = BARCODE_FORMATS.find((f) => f.value === fmt)}
									{#if fmtInfo}
										<Select.Item value={fmtInfo.value}>{fmtInfo.label}</Select.Item>
									{/if}
								{/each}
							</Select.Group>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}
	</div>

	<!-- Textarea input -->
	<div class="space-y-2">
		<Label for="batch-input">Content (one per line)</Label>
		<textarea
			id="batch-input"
			bind:value={textInput}
			class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[160px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			placeholder="Enter one item per line, e.g.:
https://example.com
https://github.com
Hello World"
		></textarea>
		<p class="text-muted-foreground text-xs">
			{lineCount} {lineCount === 1 ? 'item' : 'items'} to generate
		</p>
	</div>

	<!-- Generate button -->
	<Button onclick={generateAll} disabled={lineCount === 0 || generating} class="w-full sm:w-auto">
		{#if generating}
			<Loader2 class="mr-2 size-4 animate-spin" />
			Generating...
		{:else}
			Generate All ({lineCount})
		{/if}
	</Button>

	<!-- Results grid -->
	{#if generatedCodes.length > 0}
		<div class="space-y-4">
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" onclick={printSheet}>
					<Printer class="mr-1.5 size-4" />
					Print Sheet
				</Button>
				<Button variant="outline" size="sm" onclick={downloadAll}>
					<Download class="mr-1.5 size-4" />
					Download All
				</Button>
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{#each generatedCodes as code (code.text)}
					<div
						class="border-border flex flex-col items-center gap-2 rounded-lg border p-3 text-center"
					>
						{#if code.dataUrl}
							<img src={code.dataUrl} alt={code.text} class="max-w-full" />
						{:else}
							<p class="text-muted-foreground text-xs">Failed to generate</p>
						{/if}
						<p class="max-w-full truncate text-xs font-mono">{code.text}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
