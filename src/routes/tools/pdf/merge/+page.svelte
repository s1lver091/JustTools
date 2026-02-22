<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatFileSize } from '$lib/utils/pdf';
	import { createTypedWorker } from '$lib/workers/worker-utils';
	import {
		FileText,
		X,
		GripVertical,
		Download,
		Plus
	} from '@lucide/svelte';

	let files = $state<File[]>([]);
	let merging = $state(false);
	let resultUrl = $state('');
	let resultSize = $state(0);
	let errorMsg = $state('');
	let dragFrom = $state<number | null>(null);
	let dragOver = $state<number | null>(null);

	function handleFiles(newFiles: File[]): void {
		const pdfs = newFiles.filter(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		files = [...files, ...pdfs];
	}

	function removeFile(index: number): void {
		files = files.filter((_, i) => i !== index);
	}

	function handleDragStart(index: number, e: DragEvent): void {
		dragFrom = index;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOverItem(index: number, e: DragEvent): void {
		e.preventDefault();
		dragOver = index;
	}

	function handleDrop(index: number, e: DragEvent): void {
		e.preventDefault();
		if (dragFrom === null || dragFrom === index) {
			dragFrom = null;
			dragOver = null;
			return;
		}
		const newFiles = [...files];
		const [moved] = newFiles.splice(dragFrom, 1);
		newFiles.splice(index, 0, moved);
		files = newFiles;
		dragFrom = null;
		dragOver = null;
	}

	function handleDragEnd(): void {
		dragFrom = null;
		dragOver = null;
	}

	async function merge(): Promise<void> {
		if (files.length < 2) return;
		merging = true;
		errorMsg = '';
		revokeResult();

		try {
			const worker = createTypedWorker(
				new Worker(new URL('$lib/workers/pdf.worker.ts', import.meta.url), {
					type: 'module'
				})
			);

			const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
			const result = await worker.request('merge', { buffers });
			worker.terminate();

			const blob = new Blob([result as BlobPart], { type: 'application/pdf' });
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Merge failed';
		} finally {
			merging = false;
		}
	}

	function revokeResult(): void {
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = '';
			resultSize = 0;
		}
	}
</script>

<ToolHeader title="Merge PDFs" description="Combine multiple PDF files into one" />

<div class="space-y-4">
	<FileDropzone accept=".pdf" multiple onFiles={handleFiles} />

	{#if files.length > 0}
		<div class="space-y-2">
			{#each files as file, index (index)}
				<div
					class="flex items-center gap-3 rounded-lg border p-3 transition-colors
						{dragOver === index ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : ''}"
					draggable="true"
					role="listitem"
					ondragstart={(e) => handleDragStart(index, e)}
					ondragover={(e) => handleDragOverItem(index, e)}
					ondrop={(e) => handleDrop(index, e)}
					ondragend={handleDragEnd}
				>
					<GripVertical class="text-muted-foreground size-4 cursor-grab" />
					<FileText class="text-muted-foreground size-5" />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{file.name}</p>
						<p class="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => removeFile(index)}
						aria-label="Remove file"
					>
						<X class="size-4" />
					</Button>
				</div>
			{/each}
		</div>

		<div class="flex items-center gap-2">
			<Button onclick={merge} disabled={files.length < 2 || merging}>
				{#if merging}
					<LoadingSpinner size="sm" />
					<span class="ml-2">Merging...</span>
				{:else}
					Merge {files.length} files
				{/if}
			</Button>
		</div>
	{/if}

	{#if errorMsg}
		<div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
			{errorMsg}
		</div>
	{/if}

	{#if resultUrl}
		<div class="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
			<div class="flex-1">
				<p class="text-sm font-medium">Merged PDF ready</p>
				<p class="text-muted-foreground text-xs">{formatFileSize(resultSize)}</p>
			</div>
			<Button href={resultUrl} download="merged.pdf">
				<Download class="mr-2 size-4" />
				Download
			</Button>
		</div>
	{/if}
</div>