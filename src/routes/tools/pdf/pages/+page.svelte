<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import PdfThumbnails from '$lib/components/pdf/PdfThumbnails.svelte';
	import { loadPdf, formatFileSize } from '$lib/utils/pdf';
	import { downloadBlob } from '$lib/utils/download';
	import type { PDFDocumentProxy } from '$lib/utils/pdf';
	import { SvelteSet } from 'svelte/reactivity';
	import { createTypedWorker } from '$lib/workers/worker-utils';
	import {
		FileText,
		X,
		RotateCw,
		RotateCcw,
		Trash2,
		Download,
		Undo2
	} from '@lucide/svelte';

	let file = $state<File | null>(null);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let selectedPages = $state(new SvelteSet<number>());
	let currentPage = $state(1);
	let rotations = $state<Record<number, number>>({});
	let deletedPages = $state<Set<number>>(new Set());
	let operationHistory = $state<Array<{
		type: 'rotate' | 'delete';
		pages: number[];
		angle?: number;
	}>>([]);
	let saving = $state(false);
	let errorMsg = $state('');

	const hasOperations = $derived(operationHistory.length > 0);

	async function handleFiles(files: File[]): Promise<void> {
		const pdfFile = files.find(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (!pdfFile) return;
		cleanup();
		file = pdfFile;
		pdf = await loadPdf(pdfFile);
	}

	function handleRotate(page: number, angle: number): void {
		const current = rotations[page] ?? 0;
		rotations = { ...rotations, [page]: (current + angle) % 360 };
		operationHistory = [...operationHistory, { type: 'rotate', pages: [page], angle }];
	}

	function handleDelete(pages: number[]): void {
		const newDeleted = new Set(deletedPages);
		for (const p of pages) newDeleted.add(p);
		deletedPages = newDeleted;
		for (const p of pages) selectedPages.delete(p);
		operationHistory = [...operationHistory, { type: 'delete', pages }];
	}

	function undoLast(): void {
		if (operationHistory.length === 0) return;
		const last = operationHistory[operationHistory.length - 1];
		operationHistory = operationHistory.slice(0, -1);

		if (last.type === 'rotate' && last.angle !== undefined) {
			for (const page of last.pages) {
				const current = rotations[page] ?? 0;
				rotations = { ...rotations, [page]: (current - last.angle + 360) % 360 };
			}
		} else if (last.type === 'delete') {
			const newDeleted = new Set(deletedPages);
			for (const p of last.pages) newDeleted.delete(p);
			deletedPages = newDeleted;
		}
	}

	function rotateSelected(angle: number): void {
		if (selectedPages.size === 0) return;
		const pages = [...selectedPages];
		for (const page of pages) {
			const current = rotations[page] ?? 0;
			rotations = { ...rotations, [page]: (current + angle) % 360 };
		}
		operationHistory = [...operationHistory, { type: 'rotate', pages, angle }];
	}

	function deleteSelected(): void {
		if (selectedPages.size === 0) return;
		handleDelete([...selectedPages]);
	}

	async function applyAndDownload(): Promise<void> {
		if (!file || !pdf) return;
		saving = true;
		errorMsg = '';

		try {
			const worker = createTypedWorker(
				new Worker(new URL('$lib/workers/pdf.worker.ts', import.meta.url), {
					type: 'module'
				})
			);

			const total = pdf.numPages;
			const operations = [];
			for (let i = 1; i <= total; i++) {
				operations.push({
					pageIndex: i - 1,
					rotation: rotations[i] ?? 0,
					deleted: deletedPages.has(i)
				});
			}

			const result = await worker.request('reorganize', {
				buffer: await file.arrayBuffer(),
				operations
			});

			worker.terminate();

			const blob = new Blob([result as BlobPart], { type: 'application/pdf' });
			downloadBlob(blob, file.name.replace(/\.pdf$/i, '_managed.pdf'));
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Failed to process';
		} finally {
			saving = false;
		}
	}

	function cleanup(): void {
		pdf?.destroy();
		pdf = null;
		file = null;
		selectedPages = new SvelteSet<number>();
		rotations = {};
		deletedPages = new Set();
		operationHistory = [];
		errorMsg = '';
	}
</script>

<ToolHeader
	title="Page Manager"
	description="Rotate, delete, and reorder pages in your PDF"
/>

<div class="space-y-4">
	{#if !file}
		<FileDropzone accept=".pdf" onFiles={handleFiles} />
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="text-muted-foreground size-5" />
				<span class="text-sm font-medium">{file.name}</span>
				<span class="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
			</div>
			<Button variant="ghost" size="icon" onclick={cleanup} aria-label="Remove file">
				<X class="size-4" />
			</Button>
		</div>

		{#if pdf}
			<div class="flex flex-wrap items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => rotateSelected(90)}
					disabled={selectedPages.size === 0}
				>
					<RotateCw class="mr-1 size-4" />
					90°
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => rotateSelected(-90)}
					disabled={selectedPages.size === 0}
				>
					<RotateCcw class="mr-1 size-4" />
					-90°
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => rotateSelected(180)}
					disabled={selectedPages.size === 0}
				>
					<RotateCw class="mr-1 size-4" />
					180°
				</Button>
				<Button
					variant="destructive"
					size="sm"
					onclick={deleteSelected}
					disabled={selectedPages.size === 0}
				>
					<Trash2 class="mr-1 size-4" />
					Delete Selected
				</Button>
				<Button variant="outline" size="sm" onclick={undoLast} disabled={!hasOperations}>
					<Undo2 class="mr-1 size-4" />
					Undo
				</Button>

				{#if selectedPages.size > 0}
					<Badge variant="secondary">{selectedPages.size} selected</Badge>
				{/if}
			</div>

			<PdfThumbnails
				{pdf}
				bind:selectedPages
				bind:currentPage
				selectable
				manageable
				{rotations}
				{deletedPages}
				onRotate={handleRotate}
				onDelete={handleDelete}
			/>

			<div class="flex gap-2">
				<Button onclick={applyAndDownload} disabled={!hasOperations || saving}>
					{#if saving}
						<LoadingSpinner size="sm" />
						<span class="ml-2">Processing...</span>
					{:else}
						<Download class="mr-2 size-4" />
						Apply & Download
					{/if}
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
