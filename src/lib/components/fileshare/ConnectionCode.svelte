<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Copy, Check } from '@lucide/svelte';

	let { code }: { code: string } = $props();

	let copied = $state(false);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement('textarea');
			textarea.value = code;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<div class="relative">
	<textarea
		readonly
		class="border-border bg-muted/50 w-full resize-none rounded-lg border p-3 font-mono text-xs break-all"
		rows="4"
		value={code}
	></textarea>
	<Button
		variant="outline"
		size="sm"
		class="absolute top-2 right-2"
		onclick={copyToClipboard}
	>
		{#if copied}
			<Check class="mr-1 size-3" />
			Copied
		{:else}
			<Copy class="mr-1 size-3" />
			Copy
		{/if}
	</Button>
</div>
