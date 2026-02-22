<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PdfAnnotator from '$lib/components/pdf/PdfAnnotator.svelte';
	import { AnnotationHistory } from '$lib/utils/pdf-annotations.svelte';
	import type { AnnotationTool } from '$lib/utils/pdf-annotations.svelte';
	import { formatFileSize } from '$lib/utils/pdf';
	import {
		FileText,
		X,
		Download,
		Undo2,
		Redo2,
		Highlighter,
		Underline,
		Strikethrough,
		Pen,
		Square,
		Circle,
		ArrowRight,
		Minus,
		Type,
		Eraser,
		ZoomIn,
		ZoomOut
	} from '@lucide/svelte';

	let file = $state<File | null>(null);
	let annotations = $state(new AnnotationHistory());
	let currentTool = $state<AnnotationTool>('highlight');
	let currentColor = $state('#FFFF00');
	let strokeThickness = $state(2);
	let zoom = $state(1.0);
	let currentPage = $state(1);
	let totalPages = $state(0);
	let annotatorRef = $state<ReturnType<typeof PdfAnnotator> | null>(null);

	let saving = $state(false);
	let errorMsg = $state('');
	let resultUrl = $state('');
	let resultSize = $state(0);

	const COLORS = ['#FFFF00', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF69B4', '#6C5CE7', '#000000'];

	const tools: Array<{ tool: AnnotationTool; icon: typeof Highlighter; label: string }> = [
		{ tool: 'highlight', icon: Highlighter, label: 'Highlight' },
		{ tool: 'underline', icon: Underline, label: 'Underline' },
		{ tool: 'strikethrough', icon: Strikethrough, label: 'Strikethrough' },
		{ tool: 'pen', icon: Pen, label: 'Pen' },
		{ tool: 'rectangle', icon: Square, label: 'Rectangle' },
		{ tool: 'circle', icon: Circle, label: 'Circle' },
		{ tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
		{ tool: 'line', icon: Minus, label: 'Line' },
		{ tool: 'text', icon: Type, label: 'Text' },
		{ tool: 'eraser', icon: Eraser, label: 'Eraser' }
	];

	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 3.0;
	const ZOOM_STEP = 0.25;

	function handleFiles(newFiles: File[]): void {
		const pdfFile = newFiles.find(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (!pdfFile) return;
		cleanup();
		file = pdfFile;
	}

	async function saveAndDownload(): Promise<void> {
		if (!annotatorRef) return;
		saving = true;
		errorMsg = '';
		revokeResult();

		try {
			const blob = await annotatorRef.saveToBlob();
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	function revokeResult(): void {
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = '';
			resultSize = 0;
		}
	}

	function cleanup(): void {
		revokeResult();
		file = null;
		annotations = new AnnotationHistory();
		errorMsg = '';
	}
</script>

<ToolHeader title="Annotate PDF" description="Highlight, draw, and add notes to PDFs" />

<div class="space-y-4">
	{#if !file}
		<FileDropzone accept=".pdf" onFiles={handleFiles} />
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="text-muted-foreground size-5" />
				<span class="text-sm font-medium">{file.name}</span>
			</div>
			<Button variant="ghost" size="icon" onclick={cleanup} aria-label="Remove">
				<X class="size-4" />
			</Button>
		</div>

		<!-- Toolbar -->
		<div class="flex flex-wrap items-center gap-2 rounded-lg border p-2">
			<!-- Tools -->
			{#each tools as t (t.tool)}
				{@const Icon = t.icon}
				<Button
					variant={currentTool === t.tool ? 'default' : 'ghost'}
					size="icon"
					onclick={() => (currentTool = t.tool)}
					aria-label={t.label}
					title={t.label}
				>
					<Icon class="size-4" />
				</Button>
			{/each}

			<div class="bg-border mx-1 h-6 w-px"></div>

			<!-- Colors -->
			{#each COLORS as color (color)}
				<button
					class="size-6 rounded-full border-2 transition-transform
						{currentColor === color ? 'scale-110 border-foreground' : 'border-transparent'}"
					style="background-color: {color};"
					onclick={() => (currentColor = color)}
					aria-label="Color {color}"
				></button>
			{/each}

			<div class="bg-border mx-1 h-6 w-px"></div>

			<!-- Thickness -->
			<div class="flex items-center gap-1">
				<input
					type="range"
					min="1"
					max="10"
					bind:value={strokeThickness}
					class="w-16"
					aria-label="Stroke thickness"
				/>
				<span class="text-muted-foreground w-4 text-xs">{strokeThickness}</span>
			</div>

			<div class="bg-border mx-1 h-6 w-px"></div>

			<!-- Zoom -->
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (zoom = Math.max(zoom - ZOOM_STEP, MIN_ZOOM))}
				disabled={zoom <= MIN_ZOOM}
				aria-label="Zoom out"
			>
				<ZoomOut class="size-4" />
			</Button>
			<span class="text-muted-foreground text-xs">{Math.round(zoom * 100)}%</span>
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (zoom = Math.min(zoom + ZOOM_STEP, MAX_ZOOM))}
				disabled={zoom >= MAX_ZOOM}
				aria-label="Zoom in"
			>
				<ZoomIn class="size-4" />
			</Button>

			<div class="bg-border mx-1 h-6 w-px"></div>

			<!-- Undo/Redo -->
			<Button
				variant="ghost"
				size="icon"
				onclick={() => annotations.undo()}
				disabled={!annotations.canUndo}
				aria-label="Undo"
			>
				<Undo2 class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onclick={() => annotations.redo()}
				disabled={!annotations.canRedo}
				aria-label="Redo"
			>
				<Redo2 class="size-4" />
			</Button>

			<div class="flex-1"></div>

			<!-- Save -->
			<Button onclick={saveAndDownload} disabled={saving || annotations.annotations.length === 0}>
				{#if saving}
					<LoadingSpinner size="sm" />
					<span class="ml-2">Saving...</span>
				{:else}
					<Download class="mr-2 size-4" />
					Save & Download
				{/if}
			</Button>
		</div>

		<!-- Annotator -->
		<div class="bg-muted/30 overflow-auto rounded-lg border" style="max-height: 70vh;">
			<PdfAnnotator
				bind:this={annotatorRef}
				{file}
				bind:annotations
				{currentTool}
				{currentColor}
				{strokeThickness}
				bind:zoom
				bind:currentPage
				bind:totalPages
				onerror={(msg) => (errorMsg = msg)}
			/>
		</div>

		<!-- Page navigation -->
		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-3 py-1">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (currentPage = Math.max(1, currentPage - 1))}
					disabled={currentPage <= 1}
				>
					Prev
				</Button>
				<span class="text-muted-foreground text-sm">Page {currentPage} of {totalPages}</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
					disabled={currentPage >= totalPages}
				>
					Next
				</Button>
			</div>
		{/if}
	{/if}

	{#if errorMsg}
		<div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
			{errorMsg}
		</div>
	{/if}

	{#if resultUrl}
		<div class="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
			<div class="flex-1">
				<p class="text-sm font-medium">Annotated PDF saved</p>
				<p class="text-muted-foreground text-xs">{formatFileSize(resultSize)}</p>
			</div>
			<Button href={resultUrl} download={file?.name?.replace(/\.pdf$/i, '_annotated.pdf') ?? 'annotated.pdf'}>
				<Download class="mr-2 size-4" />
				Download
			</Button>
		</div>
	{/if}
</div>