<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Copy, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { UnicodeChar } from '$lib/utils/unicode-data';

	interface Props {
		char: UnicodeChar | null;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}

	let { char, open, onOpenChange }: Props = $props();

	type CopiedKey = string | null;
	let copiedKey = $state<CopiedKey>(null);
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	type FormatRow = { label: string; value: string; key: string };

	const formats = $derived<FormatRow[]>(
		char
			? [
					{ label: 'Character', value: char.char, key: 'char' },
					{ label: 'Codepoint', value: `U+${char.codepoint.toUpperCase()}`, key: 'cp' },
					{ label: 'HTML entity', value: `&#x${char.codepoint.toUpperCase()};`, key: 'html' },
					{ label: 'CSS escape', value: `\\${char.codepoint.toUpperCase()}`, key: 'css' },
					{ label: 'JS escape', value: `\\u{${char.codepoint.toUpperCase()}}`, key: 'js' }
				]
			: []
	);

	async function copyFormat(value: string, key: string): Promise<void> {
		await navigator.clipboard.writeText(value);
		toast(`Copied: ${value}`);
		clearTimeout(copiedTimer);
		copiedKey = key;
		copiedTimer = setTimeout(() => {
			copiedKey = null;
		}, 1500);
	}
</script>

<Popover.Root {open} {onOpenChange}>
	<Popover.Trigger class="sr-only" aria-hidden="true" />
	<Popover.Content class="w-72 p-4" align="start">
		{#if char}
			<div class="mb-3 flex items-start gap-3">
				<span class="text-5xl leading-none">{char.char}</span>
				<div class="min-w-0">
					<p class="text-sm font-semibold leading-tight">{char.name}</p>
					<p class="text-muted-foreground text-xs">{char.category}</p>
				</div>
			</div>

			<div class="space-y-1.5">
				{#each formats as fmt (fmt.key)}
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="text-muted-foreground text-xs">{fmt.label}</p>
							<code class="block truncate font-mono text-xs">{fmt.value}</code>
						</div>
						<Button
							variant="ghost"
							size="icon"
							class="size-7 shrink-0"
							onclick={() => copyFormat(fmt.value, fmt.key)}
							aria-label="Copy {fmt.label}"
						>
							{#if copiedKey === fmt.key}
								<Check class="size-3.5 text-green-500" />
							{:else}
								<Copy class="size-3.5" />
							{/if}
						</Button>
					</div>
				{/each}
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
