<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import PdfThumbnails from '$lib/components/pdf/PdfThumbnails.svelte';
	import { loadPdf, formatFileSize, parseRanges } from '$lib/utils/pdf';
	import { downloadBlob } from '$lib/utils/download';
	import type { PDFDocumentProxy } from '$lib/utils/pdf';
	import { SvelteSet } from 'svelte/reactivity';
	import { createTypedWorker } from '$lib/workers/worker-utils';
	import { FileText, X, Download, Scissors } from '@lucide/svelte';

	let file = $state<File | null>(null);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let totalPages = $state(0);
	let currentPage = $state(1);
	let selectedPages = $state(new SvelteSet<number>());

	let splitMode = $state<'selected' | 'range' | 'every'>('selected');
	let rangeInput = $state('');
	let everyN = $state(1);

	let splitting = $state(false);
	let errorMsg = $state('');
	let results = $state<Array<{ url: string; size: number; label: string }>>([]);

	let rangeValidation = $derived.by(() => {
		if (splitMode !== 'range' || !rangeInput.trim()) return null;
		return parseRanges(rangeInput, totalPages);
	});

	async function handleFiles(newFiles: File[]): Promise<void> {
		const pdfFile = newFiles.find(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (!pdfFile) return;
		cleanup();
		file = pdfFile;
		try {
			pdf = await loadPdf(pdfFile);
			totalPages = pdf.numPages;
		} catch {
			errorMsg = 'Failed to load PDF';
			file = null;
		}
	}

	function getRanges(): number[][] {
		if (splitMode === 'selected') {
			const sorted = [...selectedPages].sort((a, b) => a - b);
			return sorted.map((p) => [p]);
		}
		if (splitMode === 'range' && rangeValidation?.valid) {
			return rangeValidation.ranges;
		}
		if (splitMode === 'every') {
			const ranges: number[][] = [];
			for (let i = 1; i <= totalPages; i += everyN) {
				const group: number[] = [];
				for (let j = i; j < i + everyN && j <= totalPages; j++) {
					group.push(j);
				}
				ranges.push(group);
			}
			return ranges;
		}
		return [];
	}

	let canSplit = $derived.by(() => {
		if (!file || !pdf || splitting) return false;
		if (splitMode === 'selected') return selectedPages.size > 0;
		if (splitMode === 'range') return rangeValidation?.valid === true;
		if (splitMode === 'every') return everyN >= 1 && everyN <= totalPages;
		return false;
	});

	async function split(): Promise<void> {
		if (!file || !canSplit) return;
		splitting = true;
		errorMsg = '';
		revokeResults();

		try {
			const ranges = getRanges();
			const worker = createTypedWorker(
				new Worker(new URL('$lib/workers/pdf.worker.ts', import.meta.url), {
					type: 'module'
				})
			);

			const result = (await worker.request('split', {
				buffer: await file.arrayBuffer(),
				ranges
			})) as ArrayBuffer[];

			worker.terminate();

			results = result.map((buf, i) => {
				const blob = new Blob([buf as BlobPart], { type: 'application/pdf' });
				const rangePages = ranges[i];
				const label =
					rangePages.length === 1
						? `Page ${rangePages[0]}`
						: `Pages ${rangePages[0]}-${rangePages[rangePages.length - 1]}`;
				return {
					url: URL.createObjectURL(blob),
					size: blob.size,
					label
				};
			});
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Split failed';
		} finally {
			splitting = false;
		}
	}

	async function downloadAllAsZip(): Promise<void> {
		if (results.length === 0) return;
		const { zipSync, strToU8 } = await import('fflate');

		const zipData: Record<string, Uint8Array> = {};
		for (let i = 0; i < results.length; i++) {
			const resp = await fetch(results[i].url);
			const buf = await resp.arrayBuffer();
			zipData[`split_${i + 1}.pdf`] = new Uint8Array(buf);
		}

		const zipped = zipSync(zipData);
		const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
		downloadBlob(blob, 'split_pdfs.zip');
	}

	function revokeResults(): void {
		for (const r of results) URL.revokeObjectURL(r.url);
		results = [];
	}

	function cleanup(): void {
		revokeResults();
		pdf?.destroy();
		pdf = null;
		file = null;
		selectedPages = new SvelteSet<number>();
		errorMsg = '';
	}
</script>

<ToolHeader title="Split PDF" description="Extract pages or split into parts" />

<div class="space-y-4">
	{#if !file}
		<FileDropzone accept=".pdf" onFiles={handleFiles} />
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="text-muted-foreground size-5" />
				<span class="text-sm font-medium">{file.name}</span>
				<span class="text-muted-foreground text-xs">{totalPages} pages</span>
			</div>
			<Button variant="ghost" size="icon" onclick={cleanup} aria-label="Remove">
				<X class="size-4" />
			</Button>
		</div>
	{/if}

	{#if pdf}
		<Tabs.Root bind:value={splitMode}>
			<Tabs.List>
				<Tabs.Trigger value="selected">Extract Selected</Tabs.Trigger>
				<Tabs.Trigger value="range">Split by Range</Tabs.Trigger>
				<Tabs.Trigger value="every">Split Every N</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="selected">
				<p class="text-muted-foreground mb-3 text-sm">
					Click thumbnails to select pages. Use Ctrl/Shift for multi-select.
				</p>
				{#if selectedPages.size > 0}
					<Badge variant="secondary" class="mb-2">
						{selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected
					</Badge>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="range">
				<p class="text-muted-foreground mb-3 text-sm">
					Enter page ranges separated by commas. Example: 1-3, 5, 8-10
				</p>
				<Input
					bind:value={rangeInput}
					placeholder="1-3, 5, 8-10"
					aria-label="Page ranges"
				/>
				{#if rangeValidation && !rangeValidation.valid}
					<p class="text-destructive mt-1 text-xs">{rangeValidation.error}</p>
				{/if}
			</Tabs.Content>

			<Tabs.Content value="every">
				<p class="text-muted-foreground mb-3 text-sm">
					Split into groups of N pages each.
				</p>
				<div class="flex items-center gap-2">
					<span class="text-sm">Every</span>
					<Input
						type="number"
						min={1}
						max={totalPages}
						bind:value={everyN}
						class="w-20"
						aria-label="Pages per group"
					/>
					<span class="text-sm">pages</span>
				</div>
			</Tabs.Content>
		</Tabs.Root>

		<div>
			{#if splitMode === 'selected'}
				<PdfThumbnails
					{pdf}
					bind:selectedPages
					bind:currentPage
					selectable
				/>
			{/if}
		</div>

		<Button onclick={split} disabled={!canSplit}>
			{#if splitting}
				<LoadingSpinner size="sm" />
				<span class="ml-2">Splitting...</span>
			{:else}
				<Scissors class="mr-2 size-4" />
				Split
			{/if}
		</Button>
	{/if}

	{#if errorMsg}
		<div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
			{errorMsg}
		</div>
	{/if}

	{#if results.length > 0}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold">Results ({results.length} files)</h3>
				{#if results.length > 1}
					<Button variant="outline" size="sm" onclick={downloadAllAsZip}>
						<Download class="mr-1 size-4" />
						Download ZIP
					</Button>
				{/if}
			</div>
			{#each results as result, i (i)}
				<div class="bg-muted/50 flex items-center gap-4 rounded-lg p-3">
					<div class="flex-1">
						<p class="text-sm font-medium">{result.label}</p>
						<p class="text-muted-foreground text-xs">{formatFileSize(result.size)}</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						href={result.url}
						download={`split_${i + 1}.pdf`}
					>
						<Download class="mr-1 size-4" />
						Download
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</div>