<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Copy, Check, Download, Loader2 } from '@lucide/svelte';
	import { generatePassword, type PasswordOptions } from '$lib/utils/password-gen';
	import { generatePassphrase, type PassphraseOptions } from '$lib/utils/passphrase-gen';
	import { generateUsername, type UsernameOptions } from '$lib/utils/username-gen';

	type GenerationType = 'password' | 'passphrase' | 'username';

	const TYPE_OPTIONS: { value: GenerationType; label: string }[] = [
		{ value: 'password', label: 'Password' },
		{ value: 'passphrase', label: 'Passphrase' },
		{ value: 'username', label: 'Username' }
	];

	const FILENAMES: Record<GenerationType, string> = {
		password: 'passwords.txt',
		passphrase: 'passphrases.txt',
		username: 'usernames.txt'
	};

	let type = $state<GenerationType>('password');
	let count = $state(10);
	let items = $state<string[]>([]);
	let copied = $state(false);
	let loading = $state(false);

	let wordlist = $state<string[]>([]);
	let adjectives = $state<string[]>([]);
	let nouns = $state<string[]>([]);

	const passwordOptions: PasswordOptions = {
		length: 16,
		uppercase: true,
		lowercase: true,
		digits: true,
		symbols: false,
		excludeAmbiguous: false
	};

	const passphraseOptions: PassphraseOptions = {
		wordCount: 4,
		separator: '-',
		capitalize: true,
		addNumber: false
	};

	const usernameOptions: UsernameOptions = {
		addNumber: true,
		addSymbol: false,
		leetspeak: false
	};

	async function ensureWordlists(): Promise<void> {
		const fetches: Promise<void>[] = [];
		if (type === 'passphrase' && wordlist.length === 0) {
			fetches.push(
				fetch('/data/bip39-english.json')
					.then((r) => r.json())
					.then((data: string[]) => {
						wordlist = data;
					})
			);
		}
		if (type === 'username' && adjectives.length === 0) {
			fetches.push(
				fetch('/data/adjectives.json')
					.then((r) => r.json())
					.then((data: string[]) => {
						adjectives = data;
					}),
				fetch('/data/nouns.json')
					.then((r) => r.json())
					.then((data: string[]) => {
						nouns = data;
					})
			);
		}
		await Promise.all(fetches);
	}

	async function generate(): Promise<void> {
		loading = true;
		await ensureWordlists();
		const results: string[] = [];
		for (let i = 0; i < count; i++) {
			switch (type) {
				case 'password':
					results.push(generatePassword(passwordOptions));
					break;
				case 'passphrase':
					results.push(generatePassphrase(wordlist, passphraseOptions));
					break;
				case 'username':
					results.push(generateUsername(adjectives, nouns, usernameOptions));
					break;
			}
		}
		items = results;
		loading = false;
	}

	async function copyAll(): Promise<void> {
		await navigator.clipboard.writeText(items.join('\n'));
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
	}

	function downloadList(): void {
		const blob = new Blob([items.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = FILENAMES[type];
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-6">
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label>Type</Label>
			<Select.Root type="single" bind:value={type}>
				<Select.Trigger class="w-full">
					{TYPE_OPTIONS.find((t) => t.value === type)?.label ?? 'Select'}
				</Select.Trigger>
				<Select.Content>
					{#each TYPE_OPTIONS as opt (opt.value)}
						<Select.Item value={opt.value}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<Label>Count</Label>
				<span class="text-muted-foreground font-mono text-sm">{count}</span>
			</div>
			<input
				type="range"
				min={10}
				max={100}
				step={10}
				bind:value={count}
				class="w-full accent-emerald-500"
			/>
		</div>
	</div>

	<Button onclick={generate} disabled={loading}>
		{#if loading}
			<Loader2 class="mr-2 size-4 animate-spin" />
			Generating...
		{:else}
			Generate {count} {TYPE_OPTIONS.find((t) => t.value === type)?.label ?? ''}s
		{/if}
	</Button>

	{#if items.length > 0}
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={copyAll}>
				{#if copied}
					<Check class="mr-2 size-4 text-green-500" />
					Copied!
				{:else}
					<Copy class="mr-2 size-4" />
					Copy all
				{/if}
			</Button>
			<Button variant="outline" size="sm" onclick={downloadList}>
				<Download class="mr-2 size-4" />
				Download .txt
			</Button>
		</div>

		<div class="max-h-96 overflow-y-auto rounded-lg border">
			{#each items as item, i (i)}
				<div
					class="flex items-center gap-3 px-4 py-2 {i % 2 === 0 ? 'bg-muted/30' : ''}"
				>
					<span class="text-muted-foreground w-8 text-right font-mono text-xs">
						{i + 1}.
					</span>
					<code class="flex-1 font-mono text-sm select-all">{item}</code>
				</div>
			{/each}
		</div>
	{/if}
</div>
