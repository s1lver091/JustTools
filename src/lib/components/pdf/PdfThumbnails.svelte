<script lang="ts">
	import type { PDFDocumentProxy, PDFPageProxy } from '$lib/utils/pdf';
	import { renderPage } from '$lib/utils/pdf';
	import { SvelteSet } from 'svelte/reactivity';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		RotateCw,
		RotateCcw,
		Trash2,
		MoreVertical,
		GripVertical,
		CheckSquare
	} from '@lucide/svelte';

	interface Props {
		pdf: PDFDocumentProxy;
		selectedPages?: SvelteSet<number>;
		currentPage?: number;
		reorderable?: boolean;
		selectable?: boolean;
		manageable?: boolean;
		rotations?: Record<number, number>;
		deletedPages?: Set<number>;
		onReorder?: (from: number, to: number) => void;
		onSelect?: (pages: Set<number>) => void;
		onPageClick?: (page: number) => void;
		onRotate?: (page: number, angle: number) => void;
		onDelete?: (pages: number[]) => void;
	}

	let {
		pdf,
		selectedPages = $bindable(new SvelteSet<number>()),
		currentPage = $bindable(1),
		reorderable = false,
		selectable = false,
		manageable = false,
		rotations = {},
		deletedPages = new Set(),
		onReorder,
		onSelect,
		onPageClick,
		onRotate,
		onDelete
	}: Props = $props();

	let totalPages = $derived(pdf.numPages);
	let containerRef = $state<HTMLDivElement | null>(null);
	let canvasRefs = $state<Map<number, HTMLCanvasElement>>(new Map());
	let renderedPages = $state<Set<number>>(new Set());
	let dragFrom = $state<number | null>(null);
	let dragOver = $state<number | null>(null);

	const THUMB_SCALE = 0.3;

	function canvasAction(el: HTMLCanvasElement, page: number): void {
		canvasRefs.set(page, el);
		observeThumb(el, page);
	}

	function observeThumb(el: HTMLElement, page: number): void {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && !renderedPages.has(page)) {
						renderedPages.add(page);
						renderThumb(page);
						observer.unobserve(el);
					}
				}
			},
			{ root: containerRef, threshold: 0.1 }
		);
		observer.observe(el);
	}

	async function renderThumb(page: number): Promise<void> {
		const canvas = canvasRefs.get(page);
		if (!canvas) return;

		try {
			const pdfPage: PDFPageProxy = await pdf.getPage(page);
			await renderPage(pdfPage, canvas, THUMB_SCALE);
		} catch {
			// Ignore render failures for thumbnails
		}
	}

	function handleClick(page: number, event: MouseEvent): void {
		if (selectable) {
			if (event.ctrlKey || event.metaKey) {
				if (selectedPages.has(page)) {
					selectedPages.delete(page);
				} else {
					selectedPages.add(page);
				}
			} else if (event.shiftKey && currentPage) {
				const start = Math.min(currentPage, page);
				const end = Math.max(currentPage, page);
				for (let i = start; i <= end; i++) {
					selectedPages.add(i);
				}
			} else {
				selectedPages.clear();
				selectedPages.add(page);
			}
			onSelect?.(selectedPages);
		}

		currentPage = page;
		onPageClick?.(page);
	}

	function selectAll(): void {
		for (let i = 1; i <= totalPages; i++) {
			selectedPages.add(i);
		}
		onSelect?.(selectedPages);
	}

	function handleDragStart(page: number, event: DragEvent): void {
		if (!reorderable) return;
		dragFrom = page;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOverThumb(page: number, event: DragEvent): void {
		if (!reorderable || dragFrom === null) return;
		event.preventDefault();
		dragOver = page;
	}

	function handleDrop(page: number, event: DragEvent): void {
		event.preventDefault();
		if (!reorderable || dragFrom === null || dragFrom === page) {
			dragFrom = null;
			dragOver = null;
			return;
		}
		onReorder?.(dragFrom, page);
		dragFrom = null;
		dragOver = null;
	}

	function handleDragEnd(): void {
		dragFrom = null;
		dragOver = null;
	}

	function deleteSelected(): void {
		if (selectedPages.size === 0) return;
		onDelete?.([...selectedPages]);
	}

	function getRotation(page: number): number {
		return rotations[page] ?? 0;
	}

	let pages = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));
</script>

<div
	bind:this={containerRef}
	class="grid grid-cols-2 gap-3 overflow-y-auto p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
	style="max-height: 70vh;"
>
	{#if selectable}
		<button
			class="text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1 text-xs"
			onclick={selectAll}
		>
			<CheckSquare class="size-3" />
			Select all
		</button>
	{/if}

	{#each pages as page (page)}
		<div
			class="group relative cursor-pointer rounded border-2 transition-colors
				{currentPage === page ? 'border-primary' : 'border-transparent'}
				{selectedPages.has(page) ? 'ring-primary/50 ring-2' : ''}
				{dragOver === page ? 'border-blue-400' : ''}
				{deletedPages.has(page) ? 'opacity-40' : ''}"
			role="button"
			tabindex="0"
			onclick={(e) => handleClick(page, e)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick(page, e as unknown as MouseEvent);
				}
			}}
			draggable={reorderable}
			ondragstart={(e) => handleDragStart(page, e)}
			ondragover={(e) => handleDragOverThumb(page, e)}
			ondrop={(e) => handleDrop(page, e)}
			ondragend={handleDragEnd}
		>
			{#if reorderable}
				<div class="absolute top-1 left-1 opacity-0 group-hover:opacity-100">
					<GripVertical class="text-muted-foreground size-3" />
				</div>
			{/if}

			<canvas
				class="w-full"
				style="transform: rotate({getRotation(page)}deg);"
				use:canvasAction={page}
			></canvas>

			<div class="text-muted-foreground bg-background/80 absolute bottom-0 left-0 right-0 text-center text-xs">
				{page}
			</div>

			{#if deletedPages.has(page)}
				<div class="absolute inset-0 flex items-center justify-center">
					<Badge variant="destructive" class="px-2 py-0.5 text-xs">Deleted</Badge>
				</div>
			{/if}

			{#if getRotation(page) !== 0}
				<div class="absolute top-0.5 right-0.5">
					<Badge variant="secondary" class="px-1 py-0 text-[10px]">
						{getRotation(page)}°
					</Badge>
				</div>
			{/if}

			{#if manageable}
				<div class="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									class="bg-background/80 rounded p-0.5"
									aria-label="Page options"
								>
									<MoreVertical class="size-3" />
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item onclick={() => onRotate?.(page, 90)}>
								<RotateCw class="mr-2 size-3" />
								Rotate 90°
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => onRotate?.(page, -90)}>
								<RotateCcw class="mr-2 size-3" />
								Rotate -90°
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => onRotate?.(page, 180)}>
								<RotateCw class="mr-2 size-3" />
								Rotate 180°
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								class="text-destructive"
								onclick={() => onDelete?.([page])}
							>
								<Trash2 class="mr-2 size-3" />
								Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}
		</div>
	{/each}

	{#if manageable && selectedPages.size > 0}
		<Button
			variant="destructive"
			size="sm"
			class="mt-2"
			onclick={deleteSelected}
		>
			<Trash2 class="mr-1 size-3" />
			Delete Selected ({selectedPages.size})
		</Button>
	{/if}
</div>
