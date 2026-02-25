<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import ConnectionCode from '$lib/components/fileshare/ConnectionCode.svelte';
	import PeerStatus from '$lib/components/fileshare/PeerStatus.svelte';
	import TransferProgress from '$lib/components/fileshare/TransferProgress.svelte';
	import { PeerConnection } from '$lib/utils/webrtc';
	import {
		receiveFiles,
		type FileMetadata,
		type TransferProgress as TProgress
	} from '$lib/utils/transfer';
	import { formatFileSize } from '$lib/utils/format';
	import { Download, X, RotateCcw, ArrowLeft, Check, FileDown, Archive } from '@lucide/svelte';

	type Resolvable = Parameters<typeof resolve>[0];

	type Step = 'enter-code' | 'share-answer' | 'connected';

	let step = $state<Step>('enter-code');
	let peer = $state<PeerConnection | null>(null);
	let offerInput = $state('');
	let answerCode = $state('');
	let isProcessing = $state(false);
	let error = $state('');
	let connectionState = $state<'new' | 'connecting' | 'connected' | 'disconnected' | 'error'>(
		'new'
	);

	// Receiving state
	let isReceiving = $state(false);
	let currentMetadata = $state<FileMetadata | null>(null);
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

	interface ReceivedFile {
		name: string;
		size: number;
		mimeType: string;
		blobUrl: string;
		timestamp: number;
	}

	let receivedFiles = $state<ReceivedFile[]>([]);
	let waitingForFiles = $state(false);

	// Auto-fill from URL query parameter (QR code flow)
	const codeFromUrl = page.url.searchParams.get('code');
	if (codeFromUrl) {
		offerInput = decodeURIComponent(codeFromUrl);
	}
	let autoProcessed = false;

	$effect(() => {
		if (codeFromUrl && step === 'enter-code' && !autoProcessed) {
			autoProcessed = true;
			acceptOffer();
		}
	});

	async function acceptOffer() {
		if (!offerInput.trim()) return;
		error = '';
		isProcessing = true;

		try {
			peer = new PeerConnection();
			peer.onStateChange = (s) => {
				connectionState = s;
				if (s === 'connected') {
					step = 'connected';
					waitingForFiles = true;
					startReceiving();
				}
				if (s === 'disconnected' || s === 'error') {
					if (step !== 'connected') {
						error = 'Connection lost. Please try again.';
					}
				}
			};

			answerCode = await peer.acceptOffer(offerInput.trim());
			step = 'share-answer';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid connection code';
		} finally {
			isProcessing = false;
		}
	}

	function startReceiving() {
		if (!peer?.dataChannel) return;

		receiveFiles(
			peer.dataChannel,
			(meta) => {
				currentMetadata = meta;
				waitingForFiles = false;
				isReceiving = true;
			},
			(progress) => {
				transferProgress = progress;
			},
			(blob, meta) => {
				const blobUrl = URL.createObjectURL(blob);
				receivedFiles = [
					...receivedFiles,
					{
						name: meta.name,
						size: meta.size,
						mimeType: meta.mimeType,
						blobUrl,
						timestamp: Date.now()
					}
				];

				// Auto-download
				triggerDownload(blobUrl, meta.name);
			},
			() => {
				isReceiving = false;
				waitingForFiles = true;
			}
		);
	}

	function triggerDownload(url: string, filename: string) {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	function downloadFile(file: ReceivedFile) {
		triggerDownload(file.blobUrl, file.name);
	}

	async function downloadAllAsZip() {
		const { zipSync } = await import('fflate');
		const files: Record<string, Uint8Array> = {};

		for (const file of receivedFiles) {
			const response = await fetch(file.blobUrl);
			const buffer = await response.arrayBuffer();
			files[file.name] = new Uint8Array(buffer);
		}

		const zipped = zipSync(files);
		const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
		const url = URL.createObjectURL(zipBlob);
		triggerDownload(url, 'received-files.zip');
		URL.revokeObjectURL(url);
	}

	function resetConnection() {
		peer?.destroy();
		peer = null;
		offerInput = '';
		answerCode = '';
		step = 'enter-code';
		connectionState = 'new';
		error = '';
		receivedFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
		receivedFiles = [];
		isReceiving = false;
		waitingForFiles = false;
		currentMetadata = null;
	}
</script>

<div class="flex items-center gap-3">
	<a
		href={resolve('/tools/fileshare' as Resolvable)}
		class="text-muted-foreground hover:text-foreground transition-colors"
	>
		<ArrowLeft class="size-5" />
	</a>
	<ToolHeader title="Receive Files" description="Enter a connection code to receive files" />
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

<!-- Step 1: Enter sender's code -->
{#if step === 'enter-code'}
	<div class="space-y-4">
		<div class="flex items-center gap-2">
			<Badge variant="secondary">Step 1</Badge>
			<h3 class="font-medium">Paste the sender's connection code</h3>
		</div>
		<textarea
			class="border-border bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-xs focus:ring-2 focus:outline-none"
			rows="5"
			placeholder="Paste the connection code here..."
			bind:value={offerInput}
		></textarea>
		<Button onclick={acceptOffer} disabled={isProcessing || !offerInput.trim()}>
			{#if isProcessing}
				<LoadingSpinner size="sm" />
				<span class="ml-2">Processing code...</span>
			{:else}
				Accept
			{/if}
		</Button>
	</div>
{/if}

<!-- Step 2: Share answer code -->
{#if step === 'share-answer'}
	<div class="space-y-4">
		<div class="flex items-center gap-2">
			<Badge variant="secondary">Step 2</Badge>
			<h3 class="font-medium">Share this answer code with the sender</h3>
		</div>
		<ConnectionCode code={answerCode} />
		<p class="text-muted-foreground text-sm">
			The sender needs to paste this code to complete the connection.
		</p>
	</div>
{/if}

<!-- Step 3: Connected - Receiving files -->
{#if step === 'connected'}
	<div class="space-y-4">
		{#if waitingForFiles && !isReceiving}
			<div class="flex flex-col items-center gap-4 py-8">
				<div class="flex size-16 animate-pulse items-center justify-center rounded-full bg-blue-500/10">
					<Download class="size-8 text-blue-500" />
				</div>
				<div class="text-center">
					<h3 class="text-lg font-semibold">Waiting for files...</h3>
					<p class="text-muted-foreground mt-1 text-sm">
						The sender can now select and send files
					</p>
				</div>
			</div>
		{/if}

		{#if isReceiving}
			<TransferProgress progress={transferProgress} />
		{/if}

		{#if receivedFiles.length > 0}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<h3 class="font-medium">
						Received files ({receivedFiles.length})
					</h3>
					{#if receivedFiles.length > 1}
						<Button variant="outline" size="sm" onclick={downloadAllAsZip}>
							<Archive class="mr-1 size-3" />
							Download as ZIP
						</Button>
					{/if}
				</div>
				<ul class="divide-border divide-y rounded-lg border">
					{#each receivedFiles as file (file.name + file.timestamp)}
						<li class="flex items-center justify-between px-3 py-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{file.name}</p>
								<p class="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
							</div>
							<Button variant="ghost" size="sm" onclick={() => downloadFile(file)}>
								<FileDown class="size-4" />
							</Button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}
