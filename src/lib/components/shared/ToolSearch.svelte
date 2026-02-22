<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { searchableItems } from '$lib/tools';
	import { Search } from '@lucide/svelte';

	type Resolvable = Parameters<typeof resolve>[0];

	let query = $state('');
	let open = $state(false);
	let activeIndex = $state(-1);
	let inputRef = $state<HTMLInputElement | null>(null);
	let listRef = $state<HTMLUListElement | null>(null);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return searchableItems;
		return searchableItems.filter(
			(item) =>
				item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
		);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
			scrollActiveIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
			scrollActiveIntoView();
		} else if (e.key === 'Enter' && activeIndex >= 0 && filtered[activeIndex]) {
			e.preventDefault();
			navigate(filtered[activeIndex].href);
		} else if (e.key === 'Escape') {
			close();
		}
	}

	function scrollActiveIntoView() {
		requestAnimationFrame(() => {
			const active = listRef?.querySelector('[data-active="true"]');
			active?.scrollIntoView({ block: 'nearest' });
		});
	}

	function navigate(href: string) {
		close();
		goto(resolve(href as Resolvable));
	}

	function close() {
		open = false;
		activeIndex = -1;
		inputRef?.blur();
	}

	function handleFocus() {
		open = true;
		activeIndex = -1;
	}

	function handleBlur(e: FocusEvent) {
		const related = e.relatedTarget as HTMLElement | null;
		if (related?.closest('[data-search-dropdown]')) return;
		open = false;
		activeIndex = -1;
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			inputRef?.focus();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="relative mx-auto w-full max-w-sm">
	<div class="relative">
		<Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<input
			bind:this={inputRef}
			bind:value={query}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			type="text"
			placeholder="Search tools..."
			autocomplete="off"
			class="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border py-1 pr-14 pl-9 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
		/>
		<kbd
			class="text-muted-foreground bg-muted pointer-events-none absolute top-1/2 right-2 flex h-5 -translate-y-1/2 items-center gap-0.5 rounded px-1.5 font-mono text-[10px] font-medium"
		>
			Ctrl K
		</kbd>
	</div>

	{#if open && filtered.length > 0}
		<div
			data-search-dropdown
			class="bg-popover border-border absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-auto rounded-md border shadow-lg"
			role="listbox"
		>
			<ul bind:this={listRef} class="py-1">
				{#each filtered as item, i (item.href)}
					{@const ItemIcon = item.icon}
					<li
						role="option"
						aria-selected={i === activeIndex}
						data-active={i === activeIndex}
						class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors {i === activeIndex
							? 'bg-accent text-accent-foreground'
							: 'text-popover-foreground hover:bg-accent/50'}"
						onmousedown={() => navigate(item.href)}
						onmouseenter={() => (activeIndex = i)}
					>
						<ItemIcon class="size-4 shrink-0 opacity-60" />
						<div class="min-w-0 flex-1">
							<span class="font-medium">{item.name}</span>
							{#if item.category}
								<span class="text-muted-foreground ml-1.5 text-xs">{item.category}</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if open && query.trim() && filtered.length === 0}
		<div
			data-search-dropdown
			class="bg-popover border-border absolute top-full right-0 left-0 z-50 mt-1 rounded-md border p-4 text-center shadow-lg"
		>
			<p class="text-muted-foreground text-sm">No tools found</p>
		</div>
	{/if}
</div>
