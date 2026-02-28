<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Copy, Check, RefreshCw, Loader2 } from '@lucide/svelte';
	import { generatePassphrase, type PassphraseOptions } from '$lib/utils/passphrase-gen';
	import { base } from '$app/paths';

	const SEPARATORS = [
		{ value: ' ', label: 'Space' },
		{ value: '-', label: 'Dash' },
		{ value: '.', label: 'Dot' },
		{ value: '_', label: 'Underscore' }
	];

	let wordCount = $state(4);
	let separator = $state('-');
	let capitalize = $state(true);
	let addNumber = $state(false);
	let copied = $state(false);
	let seed = $state(0);
	let wordlist = $state<string[]>([]);
	let loading = $state(true);

	async function loadWordlist(): Promise<void> {
		const response = await fetch(`${base}/data/bip39-english.json`);
		wordlist = await response.json();
		loading = false;
	}

	loadWordlist();

	const options = $derived<PassphraseOptions>({
		wordCount,
		separator,
		capitalize,
		addNumber
	});

	const passphrase = $derived.by(() => {
		void seed;
		return generatePassphrase(wordlist, options);
	});

	const BITS_PER_WORD = 11;
	const entropy = $derived.by(() => {
		let bits = BITS_PER_WORD * wordCount;
		if (addNumber) bits += 10;
		return bits;
	});

	function regenerate(): void {
		seed++;
	}

	async function copyToClipboard(): Promise<void> {
		await navigator.clipboard.writeText(passphrase);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
	}
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex items-center justify-center gap-2 py-8">
			<Loader2 class="size-5 animate-spin" />
			<span class="text-muted-foreground text-sm">Loading wordlist...</span>
		</div>
	{:else}
		<div class="bg-muted/50 flex items-center gap-2 rounded-lg border p-4">
			<code class="flex-1 break-all font-mono text-lg select-all">{passphrase}</code>
			<Button
				variant="ghost"
				size="icon"
				onclick={copyToClipboard}
				aria-label="Copy passphrase"
			>
				{#if copied}
					<Check class="size-4 text-green-500" />
				{:else}
					<Copy class="size-4" />
				{/if}
			</Button>
			<Button variant="ghost" size="icon" onclick={regenerate} aria-label="Regenerate passphrase">
				<RefreshCw class="size-4" />
			</Button>
		</div>

		<p class="text-muted-foreground text-sm">
			{entropy} bits of entropy ({wordCount} words from 2048-word list)
		</p>

		<div class="space-y-4">
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label>Words</Label>
					<span class="text-muted-foreground font-mono text-sm">{wordCount}</span>
				</div>
				<input
					type="range"
					min={4}
					max={8}
					step={1}
					bind:value={wordCount}
					class="w-full accent-emerald-500"
				/>
			</div>

			<div class="space-y-2">
				<Label>Separator</Label>
				<Select.Root type="single" bind:value={separator}>
					<Select.Trigger class="w-full">
						{SEPARATORS.find((s) => s.value === separator)?.label ?? 'Select'}
					</Select.Trigger>
					<Select.Content>
						{#each SEPARATORS as sep (sep.value)}
							<Select.Item value={sep.value}>{sep.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Capitalize words</span>
					<Switch bind:checked={capitalize} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Add random number</span>
					<Switch bind:checked={addNumber} />
				</label>
			</div>
		</div>
	{/if}
</div>
