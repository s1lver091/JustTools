<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, ArrowLeft } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const subTools = [
		{ href: '/tools/dev/diff' as const, label: 'Text Diff' },
		{ href: '/tools/dev/regex' as const, label: 'Regex Tester' },
		{ href: '/tools/dev/hash' as const, label: 'Hash Generator' },
		{ href: '/tools/dev/jwt' as const, label: 'JWT Inspector' },
		{ href: '/tools/dev/json' as const, label: 'JSON Tools' }
	];

	let currentPath = $derived(page.url.pathname);
	let isSubRoute = $derived(currentPath !== '/tools/dev');
	let currentLabel = $derived(
		subTools.find((t) => currentPath.startsWith(t.href))?.label ?? ''
	);
</script>

{#if isSubRoute}
	<nav class="mb-4 flex items-center gap-1 text-sm">
		<Button variant="ghost" size="sm" href={resolve('/tools/dev')}>
			<ArrowLeft class="mr-1 size-4" />
			Dev Tools
		</Button>
		<ChevronRight class="text-muted-foreground size-4" />
		<span class="text-muted-foreground">{currentLabel}</span>
	</nav>
{/if}

{@render children()}
