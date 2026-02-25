<script lang="ts">
	import { page } from '$app/state';
	import { base, resolve } from '$app/paths';
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import ConnectionCode from '$lib/components/fileshare/ConnectionCode.svelte';
	import PeerStatus from '$lib/components/fileshare/PeerStatus.svelte';
	import TransferProgress from '$lib/components/fileshare/TransferProgress.svelte';
	import QRCodeDisplay from '$lib/components/fileshare/QRCodeDisplay.svelte';
	import { PeerConnection } from '$lib/utils/webrtc';
	import { sendFiles, type TransferProgress as TProgress } from '$lib/utils/transfer';
	import { formatFileSize } from '$lib/utils/format';
	import { Wifi, Copy, Check, X, Send, RotateCcw, ArrowLeft } from '@lucide/svelte';

	type Resolvable = Parameters<typeof resolve>[0];

	type Step = 'generate' | 'waiting-answer' | 'connected';

	let step = $state<Step>('generate');
	let peer = $state<PeerConnection | null>(null);
	let offerCode = $state('');
	let answerInput = $state('');
	let isGenerating = $state(false);
	let isConnecting = $state(false);
	let error = $state('');
	let connectionState = $state<'new' | 'connecting' | 'connected' | 'disconnected' | 'error'>(
		'new'
	);

	// File selection
	let selectedFiles = $state<File[]>([]);
	let isSending = $state(false);
	let transferComplete = $state(false);
	let transferProgress = $state<TProgress>({
		currentFile: '',
		currentFileIndex: 0,
		totalFiles: 0,
		fileBytesSent: 0,
		fileTotalBytes: 0,
		totalBytesSent: 0,
		totalBytes: 0,
		speed: 0,
		eta: 0
	});
	let transferStartTime = $state(0);

	const totalSize = $derived(selectedFiles.reduce((acc, f) => acc + f.size, 0));

	const qrUrl = $derived.by(() => {
		if (!offerCode) return '';
		const origin = page.url.origin;
		return `${origin}${base}/tools/fileshare/receive?code=${encodeURIComponent(offerCode)}`;
	});

	async function createConnection() {
		error = '';
		isGenerating = true;

		try {
			peer = new PeerConnection();
			peer.onStateChange = (s) => {
				connectionState = s;
				if (s === 'connected') {
					step = 'connected';
				}
				if (s === 'disconnected' || s === 'error') {
					if (step !== 'connected') {
						error = 'Connection lost. Please try again.';
					}
				}
			};

			offerCode = await peer.createOffer();
			step = 'waiting-answer';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create connection';
		} finally {
			isGenerating = false;
		}
	}

	async function acceptAnswer() {
		if (!peer || !answerInput.trim()) return;
		error = '';
		isConnecting = true;

		try {
			await peer.acceptAnswer(answerInput.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid answer code';
		} finally {
			isConnecting = false;
		}
	}

	function handleFiles(files: File[]) {
		selectedFiles = [...selectedFiles, ...files];
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	async function startSending() {
		if (!peer?.dataChannel || selectedFiles.length === 0) return;
		isSending = true;
		transferComplete = false;
		transferStartTime = Date.now();
		error = '';

		try {
			await sendFiles(peer.dataChannel, selectedFiles, (progress) => {
				transferProgress = progress;
			});
			transferComplete = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Transfer failed';
		} finally {
			isSending = false;
		}
	}

	function resetConnection() {
		peer?.destroy();
		peer = null;
		offerCode = '';
		answerInput = '';
		step = 'generate';
		connectionState = 'new';
		error = '';
		selectedFiles = [];
		isSending = false;
		transferComplete = false;
	}

	function sendMore() {
		selectedFiles = [];
		transferComplete = false;
		transferProgress = {
			currentFile: '',
			currentFileIndex: 0,
			totalFiles: 0,
			fileBytesSent: 0,
			fileTotalBytes: 0,
			totalBytesSent: 0,
			totalBytes: 0,
			speed: 0,
			eta: 0
		};
	}
</script>

<div class="flex items-center gap-3">
	<a
		href={resolve('/tools/fileshare' as Resolvable)}
		class="text-muted-foreground hover:text-foreground transition-colors"
	>
		<ArrowLeft class="size-5" />
	</a>
	<ToolHeader title="Send Files" description="Generate a connection code and share files" />
</div>

<PeerStatus state={connectionState} />

{#if error}
	<div
		class="bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
	>
		<X class="size-4 shrink-0" />
		<span>{error}</span>
		<Button variant="ghost" size="sm" class="ml-auto" onclick={resetConnection}>
			<RotateCcw class="mr-1 size-3" />
			Try again
		</Button>
	</div>
{/if}

<!-- Step 1: Generate connection code -->
{#if step === 'generate'}
	<div class="flex flex-col items-center gap-4 py-8">
		<div class="bg-primary/10 flex size-16 items-center justify-center rounded-full">
			<Wifi class="text-primary size-8" />
		</div>
		<div class="text-center">
			<h2 class="text-lg font-semibold">Create Connection</h2>
			<p class="text-muted-foreground mt-1 text-sm">
				Generate a connection code to share with the receiver
			</p>
		</div>
		<Button onclick={createConnection} disabled={isGenerating} size="lg">
			{#if isGenerating}
				<LoadingSpinner size="sm" />
				<span class="ml-2">Generating code...</span>
			{:else}
				Create Connection
			{/if}
		</Button>
	</div>
{/if}

<!-- Step 2: Share code and wait for answer -->
{#if step === 'waiting-answer'}
	<div class="space-y-6">
		<!-- Offer code display -->
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<Badge variant="secondary">Step 1</Badge>
				<h3 class="font-medium">Share this code with the receiver</h3>
			</div>
			<ConnectionCode code={offerCode} />

			{#if qrUrl}
				<div class="mt-4 flex flex-col items-center gap-2">
					<p class="text-muted-foreground text-sm">Or scan this QR code</p>
					<QRCodeDisplay data={qrUrl} />
				</div>
			{/if}
		</div>

		<!-- Answer input -->
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<Badge variant="secondary">Step 2</Badge>
				<h3 class="font-medium">Paste the receiver's answer code</h3>
			</div>
			<textarea
				class="border-border bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-xs focus:ring-2 focus:outline-none"
				rows="4"
				placeholder="Paste the answer code here..."
				bind:value={answerInput}
			></textarea>
			<Button onclick={acceptAnswer} disabled={isConnecting || !answerInput.trim() || connectionState !== 'new'}>
				{#if isConnecting}
					<LoadingSpinner size="sm" />
					<span class="ml-2">Connecting...</span>
				{:else}
					Connect
				{/if}
			</Button>
		</div>
	</div>
{/if}

<!-- Step 3: Connected - File selection and transfer -->
{#if step === 'connected'}
	<div class="space-y-4">
		{#if !isSending && !transferComplete}
			<FileDropzone multiple onFiles={handleFiles} />

			{#if selectedFiles.length > 0}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium">
							{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}, {formatFileSize(totalSize)} total
						</p>
					</div>
					<ul class="divide-border divide-y rounded-lg border">
						{#each selectedFiles as file, i (file.name + i)}
							<li class="flex items-center justify-between px-3 py-2">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{file.name}</p>
									<p class="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
								</div>
								<Button variant="ghost" size="sm" onclick={() => removeFile(i)}>
									<X class="size-4" />
								</Button>
							</li>
						{/each}
					</ul>
					<Button onclick={startSending} size="lg" class="w-full">
						<Send class="mr-2 size-4" />
						Send {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
					</Button>
				</div>
			{/if}
		{/if}

		{#if isSending}
			<TransferProgress progress={transferProgress} />
		{/if}

		{#if transferComplete}
			<div class="flex flex-col items-center gap-4 py-8">
				<div class="flex size-16 items-center justify-center rounded-full bg-green-500/10">
					<Check class="size-8 text-green-500" />
				</div>
				<div class="text-center">
					<h3 class="text-lg font-semibold">All files sent successfully</h3>
					<p class="text-muted-foreground mt-1 text-sm">
						{transferProgress.totalFiles} file{transferProgress.totalFiles > 1 ? 's' : ''}, {formatFileSize(transferProgress.totalBytes)} in {Math.round((Date.now() - transferStartTime) / 1000)}s
					</p>
				</div>
				<Button variant="outline" onclick={sendMore}>Send more files</Button>
			</div>
		{/if}
	</div>
{/if}
