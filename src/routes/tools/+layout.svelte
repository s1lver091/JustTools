<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { tools } from '$lib/tools';

	let { children }: { children: Snippet } = $props();

	const currentTool = $derived.by(() => {
		const slug = page.url.pathname.split('/')[2] ?? '';
		return tools.find((t) => t.id === slug)?.name ?? 'Tool';
	});
</script>

<nav class="text-muted-foreground mb-4 flex items-center gap-1 text-sm" aria-label="Breadcrumb">
	<a href={resolve('/')} class="hover:text-foreground transition-colors">JustTools</a>
	<span class="mx-1">/</span>
	<span class="text-foreground font-medium">{currentTool}</span>
</nav>

{@render children()}
