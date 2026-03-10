<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { tools } from '$lib/tools';

	let { children }: { children: Snippet } = $props();

	const segments = $derived(page.url.pathname.split('/').filter(Boolean));
	const toolSlug = $derived(segments[1] ?? '');
	const subSlug = $derived(segments[2]);

	const currentTool = $derived(tools.find((t) => t.id === toolSlug));
	const currentSubTool = $derived(
		subSlug
			? currentTool?.subTools?.find((st) => st.href === `/tools/${toolSlug}/${subSlug}`)
			: undefined
	);
</script>

<nav class="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
	<a href={resolve('/')} class="hover:text-foreground transition-colors">JustTools</a>
	<span>/</span>
	{#if currentSubTool}
		<a href={resolve(currentTool!.href)} class="hover:text-foreground transition-colors"
			>{currentTool!.name}</a
		>
		<span>/</span>
		<span class="text-foreground font-medium">{currentSubTool.name}</span>
	{:else}
		<span class="text-foreground font-medium">{currentTool?.name ?? 'Tool'}</span>
	{/if}
</nav>

{@render children()}
