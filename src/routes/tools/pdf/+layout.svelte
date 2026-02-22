<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, ArrowLeft } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const subTools = [
		{ href: '/tools/pdf/merge' as const, label: 'Merge' },
		{ href: '/tools/pdf/split' as const, label: 'Split' },
		{ href: '/tools/pdf/compress' as const, label: 'Compress' },
		{ href: '/tools/pdf/convert' as const, label: 'Convert' },
		{ href: '/tools/pdf/annotate' as const, label: 'Annotate' },
		{ href: '/tools/pdf/edit' as const, label: 'Edit' }
	];

	let currentPath = $derived($page.url.pathname);
	let isSubRoute = $derived(currentPath !== '/tools/pdf');
	let currentLabel = $derived(
		subTools.find((t) => currentPath.startsWith(t.href))?.label ?? ''
	);
</script>

{#if isSubRoute}
	<nav class="mb-4 flex items-center gap-1 text-sm">
		<Button variant="ghost" size="sm" href={resolve('/tools/pdf')}>
			<ArrowLeft class="mr-1 size-4" />
			PDF Editor
		</Button>
		<ChevronRight class="text-muted-foreground size-4" />
		<span class="text-muted-foreground">{currentLabel}</span>
	</nav>
{/if}

{@render children()}
