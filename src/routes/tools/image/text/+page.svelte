<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Copy,
		Download,
		ImagePlus,
		Loader2,
		Languages
	} from '@lucide/svelte';
	import { loadImageBitmap, formatFileSize } from '$lib/utils/image-export';
	import { downloadBlob } from '$lib/utils/download';
	import { ACCEPTED_IMAGE_TYPES } from '$lib/utils/image-types';
	import { toast } from 'svelte-sonner';

	interface OcrResult {
		text: string;
		confidence: number;
	}

	let image = $state<ImageBitmap | null>(null);
	let fileName = $state('');
	let fileSize = $state(0);
	let processing = $state(false);
	let progress = $state(0);
	let progressLabel = $state('');
	let result = $state<OcrResult | null>(null);
	let selectedLanguage = $state('eng');
	let ocrError = $state('');

	let previewCanvasRef = $state<HTMLCanvasElement | null>(null);
	let sourceFile = $state<File | null>(null);

	const languages = [
		{ value: 'eng', label: 'English' },
		{ value: 'ita', label: 'Italian' },
		{ value: 'fra', label: 'French' },
		{ value: 'deu', label: 'German' },
		{ value: 'spa', label: 'Spanish' },
		{ value: 'por', label: 'Portuguese' },
		{ value: 'rus', label: 'Russian' },
		{ value: 'jpn', label: 'Japanese' },
		{ value: 'chi_sim', label: 'Chinese (Simplified)' },
		{ value: 'chi_tra', label: 'Chinese (Traditional)' },
		{ value: 'kor', label: 'Korean' },
		{ value: 'ara', label: 'Arabic' },
		{ value: 'hin', label: 'Hindi' },
		{ value: 'nld', label: 'Dutch' },
		{ value: 'pol', label: 'Polish' }
	];

	$effect(() => {
		return () => {
			image?.close();
		};
	});

	$effect(() => {
		if (!previewCanvasRef || !image) return;
		const ctx = previewCanvasRef.getContext('2d');
		if (!ctx) return;
		const maxW = 400;
		const maxH = 300;
		const scale = Math.min(maxW / image.width, maxH / image.height, 1);
		previewCanvasRef.width = Math.round(image.width * scale);
		previewCanvasRef.height = Math.round(image.height * scale);
		ctx.drawImage(image, 0, 0, previewCanvasRef.width, previewCanvasRef.height);
	});

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;
		sourceFile = file;
		fileName = file.name;
		fileSize = file.size;
		image = await loadImageBitmap(file);
		result = null;
	}

	function loadAnother(): void {
		image?.close();
		image = null;
		result = null;
		sourceFile = null;
		progress = 0;
		progressLabel = '';
		ocrError = '';
	}

	async function extractText(): Promise<void> {
		if (!sourceFile) return;
		processing = true;
		progress = 0;
		progressLabel = 'Loading OCR engine...';
		ocrError = '';

		try {
			const { createWorker } = await import('tesseract.js');
			const worker = await createWorker(selectedLanguage, undefined, {
				logger: (m: { status: string; progress: number }) => {
					progressLabel = m.status;
					progress = Math.round(m.progress * 100);
				}
			});

			const { data } = await worker.recognize(sourceFile);

			result = {
				text: data.text,
				confidence: data.confidence
			};

			await worker.terminate();
		} catch (err) {
			ocrError = err instanceof Error ? err.message : 'OCR failed';
		} finally {
			processing = false;
		}
	}

	async function copyText(): Promise<void> {
		if (!result) return;
		await navigator.clipboard.writeText(result.text);
		toast('Copied!');
	}

	function downloadText(): void {
		if (!result) return;
		const blob = new Blob([result.text], { type: 'text/plain' });
		downloadBlob(blob, `${fileName.replace(/\.[^.]+$/, '')}-text.txt`);
	}

	let wordCount = $derived(
		result ? result.text.split(/\s+/).filter((w) => w.length > 0).length : 0
	);
	let charCount = $derived(result ? result.text.length : 0);
</script>

<ToolHeader
	title="Text Extraction (OCR)"
	description="Extract text from images using optical character recognition"
/>

{#if !image}
	<FileDropzone accept={ACCEPTED_IMAGE_TYPES} onFiles={handleFiles} />
{:else}
	<div class="mx-auto max-w-2xl space-y-6">
		<!-- Preview -->
		<Card.Root>
			<Card.Content class="flex flex-wrap items-center gap-3 pt-6 sm:gap-4">
				<div class="bg-muted flex shrink-0 items-center justify-center overflow-hidden rounded-lg" style="max-width: 80px; max-height: 60px;">
					<canvas
						bind:this={previewCanvasRef}
						class="max-h-full max-w-full object-contain"
					></canvas>
				</div>
				<div class="min-w-0 flex-1">
					<p class="truncate font-medium">{fileName}</p>
					<p class="text-muted-foreground text-xs sm:text-sm">
						{image.width} x {image.height} - {formatFileSize(fileSize)}
					</p>
				</div>
				<Button variant="ghost" size="sm" onclick={loadAnother}>
					<ImagePlus class="mr-1 size-4" /> New
				</Button>
			</Card.Content>
		</Card.Root>

		<!-- Language selection -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">
					<Languages class="mr-1 inline size-4" />
					Recognition Language
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-wrap gap-2">
					{#each languages as lang}
						<Button
							variant={selectedLanguage === lang.value ? 'default' : 'outline'}
							size="sm"
							onclick={() => { selectedLanguage = lang.value; result = null; }}
							disabled={processing}
						>
							{lang.label}
						</Button>
					{/each}
				</div>

				<Button
					class="w-full"
					onclick={extractText}
					disabled={processing}
				>
					{#if processing}
						<Loader2 class="mr-2 size-4 animate-spin" />
						{progressLabel} {progress}%
					{:else}
						Extract Text
					{/if}
				</Button>

				{#if processing}
					<div class="bg-muted h-2 overflow-hidden rounded-full">
						<div
							class="h-full bg-green-500 transition-all"
							style="width: {progress}%;"
						></div>
					</div>
				{/if}

				{#if ocrError}
					<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
						{ocrError}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Results -->
		{#if result}
			<Card.Root>
				<Card.Header>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<Card.Title class="text-sm">Extracted Text</Card.Title>
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="text-xs">
								{Math.round(result.confidence)}% confidence
							</Badge>
							<Badge variant="outline" class="text-xs">
								{wordCount} words, {charCount} chars
							</Badge>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if result.text.trim()}
						<div class="bg-muted max-h-80 overflow-y-auto rounded-lg p-4">
							<pre class="whitespace-pre-wrap wrap-break-word font-mono text-sm">{result.text}</pre>
						</div>

						<div class="flex gap-2">
							<Button variant="outline" class="flex-1" onclick={copyText}>
								<Copy class="mr-2 size-4" />
								Copy Text
							</Button>
							<Button variant="outline" class="flex-1" onclick={downloadText}>
								<Download class="mr-2 size-4" />
								Download as TXT
							</Button>
						</div>
					{:else}
						<p class="text-muted-foreground text-center text-sm">
							No text detected in this image. Try with a different language or a clearer image.
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
{/if}
