<script lang="ts">
	import { Upload } from '@lucide/svelte';

	interface Props {
		accept?: string;
		multiple?: boolean;
		onFiles: (files: File[]) => void;
	}

	let { accept = '', multiple = false, onFiles }: Props = $props();

	let isDragOver = $state(false);
	let inputRef = $state<HTMLInputElement | null>(null);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		if (e.dataTransfer?.files) {
			const files = Array.from(e.dataTransfer.files);
			onFiles(files);
		}
	}

	function handleInputChange(e: Event) {
		// Event target is always an HTMLInputElement since we bind this to the file input
		const target = e.target as HTMLInputElement;
		if (target.files) {
			const files = Array.from(target.files);
			onFiles(files);
			target.value = '';
		}
	}

	function handleClick() {
		inputRef?.click();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}
</script>

<div
	class="border-border hover:border-primary/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors {isDragOver
		? 'border-primary bg-primary/5'
		: ''}"
	role="button"
	tabindex="0"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={handleClick}
	onkeydown={handleKeyDown}
>
	<Upload class="text-muted-foreground mb-3 size-10" />
	<p class="text-muted-foreground text-sm font-medium">Drag & drop files here or click to browse</p>
	{#if accept}
		<p class="text-muted-foreground/60 mt-1 text-xs">Accepted: {accept}</p>
	{/if}
</div>

<input
	bind:this={inputRef}
	type="file"
	{accept}
	{multiple}
	class="hidden"
	onchange={handleInputChange}
/>
