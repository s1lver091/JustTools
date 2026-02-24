<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, ArrowLeft } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const subTools = [
		{ href: '/tools/image/editor' as const, label: 'Edit' },
		{ href: '/tools/image/adjust' as const, label: 'Adjustments' },
		{ href: '/tools/image/convert' as const, label: 'Convert' },
		{ href: '/tools/image/exif' as const, label: 'EXIF' },
		{ href: '/tools/image/colorpicker' as const, label: 'Color Picker' },
		{ href: '/tools/image/text' as const, label: 'Text (OCR)' },
		{ href: '/tools/image/batch' as const, label: 'Batch' }
	];

	let currentPath = $derived($page.url.pathname);
	let isSubRoute = $derived(currentPath !== '/tools/image');
	let currentLabel = $derived(
		subTools.find((t) => currentPath.startsWith(t.href))?.label ?? ''
	);
</script>

{#if isSubRoute}
	<nav class="mb-4 flex items-center gap-1 text-sm">
		<Button variant="ghost" size="sm" href={resolve('/tools/image')}>
			<ArrowLeft class="mr-1 size-4" />
			Image Editor
		</Button>
		<ChevronRight class="text-muted-foreground size-4" />
		<span class="text-muted-foreground">{currentLabel}</span>
	</nav>
{/if}

{@render children()}
