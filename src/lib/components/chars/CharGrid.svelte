<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { toast } from 'svelte-sonner';
	import { Check } from '@lucide/svelte';
	import CharDetail from './CharDetail.svelte';
	import type { UnicodeChar } from '$lib/utils/unicode-data';

	interface Props {
		chars: UnicodeChar[];
		onCopy?: (c: UnicodeChar) => void;
	}

	let { chars, onCopy }: Props = $props();

	const CELL_SIZE = 56;
	const BUFFER_ROWS = 3;

	let containerWidth = $state(600);
	let scrollTop = $state(0);
	let containerHeight = $state(400);

	function observeSize(el: HTMLElement) {
		containerWidth = el.clientWidth;
		containerHeight = el.clientHeight;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentRect.width;
				containerHeight = entry.contentRect.height;
			}
		});
		ro.observe(el);
		return { destroy: () => ro.disconnect() };
	}

	let copiedChar = $state<string | null>(null);
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	let detailChar = $state<UnicodeChar | null>(null);
	let detailOpen = $state(false);
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;

	const cols = $derived(Math.max(1, Math.floor(containerWidth / CELL_SIZE)));
	const totalRows = $derived(Math.ceil(chars.length / cols));
	const startRow = $derived(Math.max(0, Math.floor(scrollTop / CELL_SIZE) - BUFFER_ROWS));
	const endRow = $derived(
		Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / CELL_SIZE) + BUFFER_ROWS)
	);
	const visibleChars = $derived(chars.slice(startRow * cols, endRow * cols));
	const offsetY = $derived(startRow * CELL_SIZE);
	const bottomSpacerHeight = $derived(Math.max(0, (totalRows - endRow) * CELL_SIZE));

	function handleScroll(e: Event): void {
		scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}

	async function copyChar(c: UnicodeChar): Promise<void> {
		await navigator.clipboard.writeText(c.char);
		toast(`Copied ${c.char} - ${c.name}`);
		onCopy?.(c);
		clearTimeout(copiedTimer);
		copiedChar = c.char;
		copiedTimer = setTimeout(() => {
			copiedChar = null;
		}, 1000);
	}

	function openDetail(c: UnicodeChar): void {
		detailChar = c;
		detailOpen = true;
	}

	function handleContextMenu(e: MouseEvent, c: UnicodeChar): void {
		e.preventDefault();
		openDetail(c);
	}

	function handlePointerDown(e: PointerEvent, c: UnicodeChar): void {
		if (e.pointerType !== 'touch') return;
		clearTimeout(longPressTimer);
		longPressTimer = setTimeout(() => {
			openDetail(c);
		}, 500);
	}

	function handlePointerUp(): void {
		clearTimeout(longPressTimer);
	}

	function handlePointerCancel(): void {
		clearTimeout(longPressTimer);
	}

	$effect(() => {
		return () => {
			clearTimeout(copiedTimer);
			clearTimeout(longPressTimer);
		};
	});
</script>

<CharDetail char={detailChar} open={detailOpen} onOpenChange={(v) => (detailOpen = v)} />

<div
	use:observeSize
	class="relative overflow-y-auto rounded-lg border"
	style="max-height: 70vh;"
	onscroll={handleScroll}
>
	<!-- Top spacer -->
	<div style="height: {offsetY}px;" aria-hidden="true"></div>

	<!-- Visible grid -->
	<div class="grid px-1" style="grid-template-columns: repeat({cols}, {CELL_SIZE}px);">
		{#each visibleChars as c (c.codepoint + c.char)}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="flex size-14 items-center justify-center rounded-lg text-2xl transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {copiedChar === c.char ? 'bg-green-500/10' : ''}"
							onclick={() => copyChar(c)}
							oncontextmenu={(e) => handleContextMenu(e, c)}
							onpointerdown={(e) => handlePointerDown(e, c)}
							onpointerup={handlePointerUp}
							onpointercancel={handlePointerCancel}
							aria-label="Copy {c.name}"
						>
							{#if copiedChar === c.char}
								<Check class="size-4 text-green-500" />
							{:else}
								{c.char}
							{/if}
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p class="text-xs">{c.name}</p>
					<p class="text-muted-foreground text-xs">U+{c.codepoint.toUpperCase()}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/each}
	</div>

	<!-- Bottom spacer -->
	<div style="height: {bottomSpacerHeight}px;" aria-hidden="true"></div>
</div>
