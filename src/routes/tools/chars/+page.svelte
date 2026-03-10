<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { Input } from '$lib/components/ui/input';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import CategoryNav from '$lib/components/chars/CategoryNav.svelte';
	import CharGrid from '$lib/components/chars/CharGrid.svelte';
	import { loadUnicodeChars, searchChars, getOrderedCategories } from '$lib/utils/unicode-data';
	import type { UnicodeChar } from '$lib/utils/unicode-data';

	const RECENTLY_USED_KEY = 'chars:recently-used';
	const MAX_RECENT = 20;

	let allChars = $state.raw<UnicodeChar[]>([]);
	let loading = $state(true);
	let loadError = $state('');
	let selectedCategory = $state('All');
	let searchQuery = $state('');
	let recentlyUsed = $state.raw<UnicodeChar[]>([]);

	let searchDebounce: ReturnType<typeof setTimeout> | undefined;
	let debouncedQuery = $state('');

	const categories = $derived(getOrderedCategories(allChars));

	const categoryFiltered = $derived(
		selectedCategory === 'All'
			? allChars
			: allChars.filter((c) => c.category === selectedCategory)
	);

	const displayChars = $derived(
		debouncedQuery ? searchChars(allChars, debouncedQuery) : categoryFiltered
	);

	const showRecently = $derived(recentlyUsed.length > 0 && !debouncedQuery);

	$effect(() => {
		const query = searchQuery;
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			debouncedQuery = query;
		}, 150);
		return () => clearTimeout(searchDebounce);
	});

	$effect(() => {
		loadUnicodeChars()
			.then((chars) => {
				allChars = chars;
				loading = false;
			})
			.catch(() => {
				loadError = 'Failed to load character data.';
				loading = false;
			});

		try {
			const stored = localStorage.getItem(RECENTLY_USED_KEY);
			if (stored) recentlyUsed = JSON.parse(stored) as UnicodeChar[];
		} catch {
			// ignore parse errors
		}
	});

	function handleCopy(c: UnicodeChar): void {
		const next = [c, ...recentlyUsed.filter((r) => r.codepoint !== c.codepoint)].slice(
			0,
			MAX_RECENT
		);
		recentlyUsed = next;
		try {
			localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(next));
		} catch {
			// ignore storage errors
		}
	}
</script>

<ToolHeader
	title="Emoji & Characters"
	description="Search, browse, and copy Unicode characters, emoji, arrows, and symbols"
/>

<div class="space-y-4">
	<Input
		bind:value={searchQuery}
		placeholder="Search by name, keyword, or codepoint (e.g. U+1F525)..."
		class="max-w-md"
	/>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<LoadingSpinner size="lg" />
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
			<p class="text-sm text-red-700 dark:text-red-400">{loadError}</p>
		</div>
	{:else}
		{#if showRecently}
			<div class="space-y-2">
				<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
					Recently used
				</h3>
				<CharGrid chars={recentlyUsed} onCopy={handleCopy} />
			</div>
		{/if}

		{#if !debouncedQuery}
			<CategoryNav
				{categories}
				selected={selectedCategory}
				onSelect={(cat) => (selectedCategory = cat)}
			/>
		{/if}

		{#if displayChars.length === 0}
			<p class="text-muted-foreground py-8 text-center text-sm">
				No characters found for "{debouncedQuery}"
			</p>
		{:else}
			<CharGrid chars={displayChars} onCopy={handleCopy} />
		{/if}
	{/if}
</div>
