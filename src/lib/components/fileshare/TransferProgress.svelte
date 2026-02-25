<script lang="ts">
	import type { TransferProgress } from '$lib/utils/transfer';
	import { formatFileSize, formatSpeed, formatEta } from '$lib/utils/format';

	let { progress }: { progress: TransferProgress } = $props();

	const filePercent = $derived(
		progress.fileTotalBytes > 0
			? Math.round((progress.fileBytesSent / progress.fileTotalBytes) * 100)
			: 0
	);

	const totalPercent = $derived(
		progress.totalBytes > 0
			? Math.round((progress.totalBytesSent / progress.totalBytes) * 100)
			: 0
	);
</script>

<div class="space-y-3 rounded-lg border p-4">
	<!-- Current file info -->
	<div class="flex items-center justify-between">
		<p class="truncate text-sm font-medium">{progress.currentFile}</p>
		{#if progress.totalFiles > 1}
			<span class="text-muted-foreground shrink-0 text-xs">
				File {progress.currentFileIndex + 1} of {progress.totalFiles}
			</span>
		{/if}
	</div>

	<!-- File progress bar -->
	<div>
		<div class="bg-secondary h-2 w-full overflow-hidden rounded-full">
			<div
				class="bg-primary h-full rounded-full transition-all duration-200"
				style="width: {filePercent}%"
				role="progressbar"
				aria-valuenow={filePercent}
				aria-valuemin={0}
				aria-valuemax={100}
			></div>
		</div>
	</div>

	<!-- Stats row -->
	<div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
		<span>{formatFileSize(progress.fileBytesSent)} / {formatFileSize(progress.fileTotalBytes)}</span>
		<span>{formatSpeed(progress.speed)}</span>
		{#if progress.eta > 0}
			<span>{formatEta(progress.eta)}</span>
		{/if}
	</div>

	<!-- Overall progress (multi-file) -->
	{#if progress.totalFiles > 1}
		<div class="border-border border-t pt-3">
			<div class="mb-1 flex items-center justify-between text-xs">
				<span class="text-muted-foreground">Overall progress</span>
				<span class="font-medium">{totalPercent}%</span>
			</div>
			<div class="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
				<div
					class="bg-primary/70 h-full rounded-full transition-all duration-200"
					style="width: {totalPercent}%"
				></div>
			</div>
		</div>
	{/if}
</div>
