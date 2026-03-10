<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Copy, Download, Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { downloadBlob } from '$lib/utils/download';
	import { generatePassword, type PasswordOptions } from '$lib/utils/password-gen';
	import { generatePassphrase, type PassphraseOptions } from '$lib/utils/passphrase-gen';
	import { generateUsername, type UsernameOptions } from '$lib/utils/username-gen';
	import { base } from '$app/paths';

	type GenerationType = 'password' | 'passphrase' | 'username';

	const SEPARATORS = [
		{ value: ' ', label: 'Space' },
		{ value: '-', label: 'Dash' },
		{ value: '.', label: 'Dot' },
		{ value: '_', label: 'Underscore' }
	];

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
	let loading = $state(false);

	let wordlist = $state<string[]>([]);
	let adjectives = $state<string[]>([]);
	let nouns = $state<string[]>([]);

	// Password options
	let pwLength = $state(16);
	let pwUppercase = $state(true);
	let pwLowercase = $state(true);
	let pwDigits = $state(true);
	let pwSymbols = $state(false);
	let pwExcludeAmbiguous = $state(false);

	// Passphrase options
	let ppWordCount = $state(4);
	let ppSeparator = $state('-');
	let ppCapitalize = $state(true);
	let ppAddNumber = $state(false);

	// Username options
	let unAddNumber = $state(true);
	let unAddSymbol = $state(false);
	let unLeetspeak = $state(false);

	const passwordOptions = $derived<PasswordOptions>({
		length: pwLength,
		uppercase: pwUppercase,
		lowercase: pwLowercase,
		digits: pwDigits,
		symbols: pwSymbols,
		excludeAmbiguous: pwExcludeAmbiguous
	});

	const passphraseOptions = $derived<PassphraseOptions>({
		wordCount: ppWordCount,
		separator: ppSeparator,
		capitalize: ppCapitalize,
		addNumber: ppAddNumber
	});

	const usernameOptions = $derived<UsernameOptions>({
		addNumber: unAddNumber,
		addSymbol: unAddSymbol,
		leetspeak: unLeetspeak
	});

	async function ensureWordlists(): Promise<void> {
		const fetches: Promise<void>[] = [];
		if (type === 'passphrase' && wordlist.length === 0) {
			fetches.push(
				fetch(`${base}/data/bip39-english.json`)
					.then((r) => r.json())
					.then((data: string[]) => {
						wordlist = data;
					})
			);
		}
		if (type === 'username' && adjectives.length === 0) {
			fetches.push(
				fetch(`${base}/data/adjectives.json`)
					.then((r) => r.json())
					.then((data: string[]) => {
						adjectives = data;
					}),
				fetch(`${base}/data/nouns.json`)
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
		toast('Copied!');
	}

	function downloadList(): void {
		const blob = new Blob([items.join('\n')], { type: 'text/plain' });
		downloadBlob(blob, FILENAMES[type]);
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

	{#if type === 'password'}
		<div class="space-y-4 rounded-lg border p-4">
			<p class="text-sm font-medium">Password Options</p>
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label>Length</Label>
					<span class="text-muted-foreground font-mono text-sm">{pwLength}</span>
				</div>
				<input
					type="range"
					min={8}
					max={128}
					step={1}
					bind:value={pwLength}
					class="w-full accent-emerald-500"
				/>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Uppercase (A-Z)</span>
					<Switch bind:checked={pwUppercase} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Lowercase (a-z)</span>
					<Switch bind:checked={pwLowercase} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Digits (0-9)</span>
					<Switch bind:checked={pwDigits} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Symbols (!@#$...)</span>
					<Switch bind:checked={pwSymbols} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3 sm:col-span-2">
					<span class="text-sm">Exclude ambiguous (0, O, 1, l, I)</span>
					<Switch bind:checked={pwExcludeAmbiguous} />
				</label>
			</div>
		</div>
	{:else if type === 'passphrase'}
		<div class="space-y-4 rounded-lg border p-4">
			<p class="text-sm font-medium">Passphrase Options</p>
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label>Words</Label>
					<span class="text-muted-foreground font-mono text-sm">{ppWordCount}</span>
				</div>
				<input
					type="range"
					min={4}
					max={8}
					step={1}
					bind:value={ppWordCount}
					class="w-full accent-emerald-500"
				/>
			</div>
			<div class="space-y-2">
				<Label>Separator</Label>
				<Select.Root type="single" bind:value={ppSeparator}>
					<Select.Trigger class="w-full">
						{SEPARATORS.find((s) => s.value === ppSeparator)?.label ?? 'Select'}
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
					<Switch bind:checked={ppCapitalize} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Add random number</span>
					<Switch bind:checked={ppAddNumber} />
				</label>
			</div>
		</div>
	{:else if type === 'username'}
		<div class="space-y-4 rounded-lg border p-4">
			<p class="text-sm font-medium">Username Options</p>
			<div class="grid gap-3 sm:grid-cols-3">
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Add number</span>
					<Switch bind:checked={unAddNumber} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Add symbol</span>
					<Switch bind:checked={unAddSymbol} />
				</label>
				<label class="flex items-center justify-between gap-2 rounded-lg border p-3">
					<span class="text-sm">Leetspeak</span>
					<Switch bind:checked={unLeetspeak} />
				</label>
			</div>
		</div>
	{/if}

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
				<Copy class="mr-2 size-4" />
				Copy all
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
