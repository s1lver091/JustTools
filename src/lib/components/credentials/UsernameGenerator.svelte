<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Copy, RefreshCw, Loader2 } from '@lucide/svelte';
	import { generateUsername, type UsernameOptions } from '$lib/utils/username-gen';
	import { base } from '$app/paths';
	import { toast } from 'svelte-sonner';

	const BATCH_SIZE = 5;

	let addNumber = $state(false);
	let addSymbol = $state(false);
	let leetspeak = $state(false);
	let seed = $state(0);
	let adjectives = $state<string[]>([]);
	let nouns = $state<string[]>([]);
	let loading = $state(true);

	async function loadWordlists(): Promise<void> {
		const [adjRes, nounRes] = await Promise.all([
			fetch(`${base}/data/adjectives.json`),
			fetch(`${base}/data/nouns.json`)
		]);
		adjectives = await adjRes.json();
		nouns = await nounRes.json();
		loading = false;
	}

	loadWordlists();

	const options = $derived<UsernameOptions>({ addNumber, addSymbol, leetspeak });

	const usernames = $derived.by(() => {
		void seed;
		if (adjectives.length === 0 || nouns.length === 0) return [];
		const results: string[] = [];
		for (let i = 0; i < BATCH_SIZE; i++) {
			results.push(generateUsername(adjectives, nouns, options));
		}
		return results;
	});

	function regenerate(): void {
		seed++;
	}

	async function copyUsername(index: number): Promise<void> {
		await navigator.clipboard.writeText(usernames[index]);
		toast('Copied!');
	}
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex items-center justify-center gap-2 py-8">
			<Loader2 class="size-5 animate-spin" />
			<span class="text-muted-foreground text-sm">Loading word lists...</span>
		</div>
	{:else}
		<div class="space-y-2">
			{#each usernames as username, i (i + '-' + seed)}
				<div class="bg-muted/50 flex items-center gap-2 rounded-lg border px-4 py-3">
					<code class="flex-1 font-mono text-base select-all">{username}</code>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => copyUsername(i)}
						aria-label="Copy username"
					>
						<Copy class="size-4" />
					</Button>
				</div>
			{/each}
		</div>

		<Button variant="outline" onclick={regenerate}>
			<RefreshCw class="mr-2 size-4" />
			Regenerate
		</Button>

		<div class="grid gap-3 sm:grid-cols-3">
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Add number</span>
				<Switch bind:checked={addNumber} />
			</label>
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Add symbol</span>
				<Switch bind:checked={addSymbol} />
			</label>
			<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span class="text-sm">Leetspeak</span>
				<Switch bind:checked={leetspeak} />
			</label>
		</div>
	{/if}
</div>
