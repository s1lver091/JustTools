<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import { hashAllAlgorithms } from '$lib/utils/hash';
	import type { HashAlgorithm } from '$lib/utils/hash';
	import { toBase64, fromBase64, textToHex, hexToText, urlEncode, urlDecode } from '$lib/utils/encoding';
	import { Copy, Check } from '@lucide/svelte';

	let hashInputMode = $state<'text' | 'file'>('text');
	let hashText = $state('');
	let hashFile = $state<File | null>(null);
	let hashes = $state<Record<HashAlgorithm, string>>({ 'SHA-1': '', 'SHA-256': '', 'SHA-512': '' });
	let copiedKey = $state('');
	let encodeInput = $state('');

	type CodecState = { result: string; error: string };

	const codecs = [
		{ label: 'Base64', encode: toBase64, decode: fromBase64, decodeError: 'Invalid Base64 input' },
		{ label: 'Hex', encode: textToHex, decode: hexToText, decodeError: 'Invalid hex input' },
		{ label: 'URL', encode: urlEncode, decode: urlDecode, decodeError: 'Invalid URL-encoded input' }
	];

	let codecStates = $state<Record<string, CodecState>>({
		Base64: { result: '', error: '' },
		Hex: { result: '', error: '' },
		URL: { result: '', error: '' }
	});

	function runCodec(fn: (input: string) => string, label: string, errorMsg: string) {
		try {
			codecStates[label] = { result: fn(encodeInput), error: '' };
		} catch (e) {
			codecStates[label] = { result: '', error: e instanceof Error ? e.message : errorMsg };
		}
	}

	async function computeHashes() {
		if (hashInputMode === 'text') {
			hashes = await hashAllAlgorithms(hashText);
		} else if (hashFile) {
			const buffer = await hashFile.arrayBuffer();
			hashes = await hashAllAlgorithms(buffer);
		}
	}

	$effect(() => {
		if (hashInputMode === 'text' && hashText) {
			computeHashes();
		}
	});

	function handleFiles(files: File[]) {
		if (files.length > 0) {
			hashFile = files[0];
			computeHashes();
		}
	}

	async function copyToClipboard(text: string, key: string) {
		await navigator.clipboard.writeText(text);
		copiedKey = key;
		setTimeout(() => {
			copiedKey = '';
		}, 1500);
	}

	const algorithms: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-512'];
</script>

<ToolHeader title="Hash Generator" description="Generate SHA hashes and encode/decode Base64, hex, and URLs" />

<div class="space-y-6">
	<!-- Section A: Hashing -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Hashing</h2>

		<Tabs.Root bind:value={hashInputMode}>
			<Tabs.List>
				<Tabs.Trigger value="text">Text</Tabs.Trigger>
				<Tabs.Trigger value="file">File</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="text" class="mt-3">
				<textarea
					bind:value={hashText}
					placeholder="Enter text to hash..."
					rows="4"
					class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-sm focus:ring-2 focus:outline-none"
				></textarea>
			</Tabs.Content>
			<Tabs.Content value="file" class="mt-3">
				<FileDropzone accept="*" onFiles={handleFiles} />
				{#if hashFile}
					<p class="text-muted-foreground mt-2 text-sm">File: {hashFile.name}</p>
				{/if}
			</Tabs.Content>
		</Tabs.Root>

		<!-- Hash results -->
		<div class="space-y-2">
			{#each algorithms as alg (alg)}
				<div class="flex items-center gap-2">
					<Label class="w-20 shrink-0 text-right font-mono text-xs">{alg}</Label>
					<code class="bg-muted border-border flex-1 overflow-x-auto rounded border px-3 py-2 font-mono text-xs break-all">
						{hashes[alg] || '...'}
					</code>
					<Button
						variant="ghost"
						size="icon"
						class="size-8 shrink-0"
						disabled={!hashes[alg]}
						onclick={() => copyToClipboard(hashes[alg], alg)}
					>
						{#if copiedKey === alg}
							<Check class="size-4 text-green-500" />
						{:else}
							<Copy class="size-4" />
						{/if}
					</Button>
				</div>
			{/each}
		</div>
	</section>

	<Separator />

	<!-- Section B: Encode/Decode -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Encode / Decode</h2>

		<div class="space-y-2">
			<Label for="encode-input">Input</Label>
			<textarea
				id="encode-input"
				bind:value={encodeInput}
				placeholder="Enter text to encode or decode..."
				rows="3"
				class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-sm focus:ring-2 focus:outline-none"
			></textarea>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			{#each codecs as codec (codec.label)}
				{@const state = codecStates[codec.label]}
				<div class="space-y-2">
					<Label>{codec.label}</Label>
					<div class="flex gap-1">
						<Button variant="outline" size="sm" onclick={() => runCodec(codec.encode, codec.label, 'Encoding failed')} disabled={!encodeInput}>Encode</Button>
						<Button variant="outline" size="sm" onclick={() => runCodec(codec.decode, codec.label, codec.decodeError)} disabled={!encodeInput}>Decode</Button>
						{#if state.result}
							<Button
								variant="ghost"
								size="icon"
								class="ml-auto size-8"
								onclick={() => copyToClipboard(state.result, codec.label)}
							>
								{#if copiedKey === codec.label}
									<Check class="size-4 text-green-500" />
								{:else}
									<Copy class="size-4" />
								{/if}
							</Button>
						{/if}
					</div>
					{#if state.error}
						<p class="text-sm text-red-600 dark:text-red-400">{state.error}</p>
					{:else if state.result}
						<code class="bg-muted border-border block overflow-x-auto rounded border px-3 py-2 font-mono text-xs break-all">
							{state.result}
						</code>
					{/if}
				</div>
			{/each}
		</div>
	</section>
</div>
