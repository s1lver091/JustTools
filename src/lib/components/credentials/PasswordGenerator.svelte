<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Copy, RefreshCw } from '@lucide/svelte';
	import {
		generatePassword,
		calculateEntropy,
		buildCharset,
		type PasswordOptions
	} from '$lib/utils/password-gen';
	import { toast } from 'svelte-sonner';

	let length = $state(16);
	let uppercase = $state(true);
	let lowercase = $state(true);
	let digits = $state(true);
	let symbols = $state(false);
	let excludeAmbiguous = $state(false);
	let seed = $state(0);

	const options = $derived<PasswordOptions>({
		length,
		uppercase,
		lowercase,
		digits,
		symbols,
		excludeAmbiguous
	});

	const charsetSize = $derived(buildCharset(options).length);
	const entropy = $derived(calculateEntropy(charsetSize, length));

	const password = $derived.by(() => {
		void seed;
		return generatePassword(options);
	});

	function regenerate(): void {
		seed++;
	}

	async function copyToClipboard(): Promise<void> {
		await navigator.clipboard.writeText(password);
		toast('Copied!');
	}
</script>

<div class="space-y-6">
	<div class="bg-muted/50 flex items-center gap-2 rounded-lg border p-4">
		<code class="flex-1 break-all font-mono text-lg select-all">{password}</code>
		<Button variant="ghost" size="icon" onclick={copyToClipboard} aria-label="Copy password">
			<Copy class="size-4" />
		</Button>
		<Button variant="ghost" size="icon" onclick={regenerate} aria-label="Regenerate password">
			<RefreshCw class="size-4" />
		</Button>
	</div>

	{#if charsetSize > 0}
		<p class="text-muted-foreground text-sm">
			{entropy} bits of entropy ({charsetSize} unique characters)
		</p>
	{:else}
		<p class="text-sm text-red-500">Select at least one character set</p>
	{/if}

	<div class="space-y-4">
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<Label>Length</Label>
				<span class="text-muted-foreground text-sm font-mono">{length}</span>
			</div>
			<input
				type="range"
				min={8}
				max={128}
				step={1}
				bind:value={length}
				class="w-full accent-emerald-500"
			/>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Uppercase (A-Z)</span>
				<Switch bind:checked={uppercase} />
			</label>
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Lowercase (a-z)</span>
				<Switch bind:checked={lowercase} />
			</label>
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Digits (0-9)</span>
				<Switch bind:checked={digits} />
			</label>
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Symbols (!@#$...)</span>
				<Switch bind:checked={symbols} />
			</label>
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3 sm:col-span-2">
				<span class="text-sm">Exclude ambiguous (0, O, 1, l, I)</span>
				<Switch bind:checked={excludeAmbiguous} />
			</label>
		</div>
	</div>
</div>
