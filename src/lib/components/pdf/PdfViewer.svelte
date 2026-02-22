<script lang="ts">
	import { loadPdf, renderPage } from '$lib/utils/pdf';
	import type { PDFDocumentProxy, PDFPageProxy } from '$lib/utils/pdf';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';

	interface Props {
		file: File | ArrayBuffer;
		zoom?: number;
		currentPage?: number;
		onPageChange?: (page: number) => void;
		onPdfLoaded?: (pdf: PDFDocumentProxy) => void;
	}

	let {
		file,
		zoom = $bindable(1.0),
		currentPage = $bindable(1),
		onPageChange,
		onPdfLoaded
	}: Props = $props();

	let pdf = $state<PDFDocumentProxy | null>(null);
	let totalPages = $state(0);
	let loading = $state(true);
	let error = $state('');
	let canvasRef = $state<HTMLCanvasElement | null>(null);

	let prevFile: File | ArrayBuffer | null = null;

	$effect(() => {
		const currentFile = file;
		if (currentFile === prevFile) return;
		prevFile = currentFile;

		loading = true;
		error = '';

		loadPdf(currentFile)
			.then((doc) => {
				pdf = doc;
				totalPages = doc.numPages;
				currentPage = 1;
				loading = false;
				onPdfLoaded?.(doc);
			})
			.catch(() => {
				error = 'Failed to load PDF';
				loading = false;
			});

		return () => {
			pdf?.destroy();
		};
	});

	async function renderCurrentViewerPage(): Promise<void> {
		const doc = pdf;
		const page = currentPage;
		const scale = zoom;
		const canvas = canvasRef;

		if (!doc || !canvas || page < 1 || page > totalPages) return;

		const pdfPage: PDFPageProxy = await doc.getPage(page);
		await renderPage(pdfPage, canvas, scale);
	}

	$effect(() => {
		if (pdf && currentPage && zoom && canvasRef) {
			renderCurrentViewerPage();
		}
	});

	function goToPage(page: number): void {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			onPageChange?.(page);
		}
	}
</script>

<div class="flex flex-col items-center gap-4">
	{#if loading}
		<LoadingSpinner />
	{:else if error}
		<p class="text-destructive text-sm">{error}</p>
	{:else}
		<div class="bg-muted/30 overflow-auto rounded-lg border" style="max-height: 70vh;">
			<canvas bind:this={canvasRef} class="block"></canvas>
		</div>

		{#if totalPages > 1}
			<div class="flex items-center gap-3">
				<button
					class="text-muted-foreground hover:text-foreground text-sm disabled:opacity-40"
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					Previous
				</button>
				<span class="text-muted-foreground text-sm">
					Page {currentPage} of {totalPages}
				</span>
				<button
					class="text-muted-foreground hover:text-foreground text-sm disabled:opacity-40"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>
