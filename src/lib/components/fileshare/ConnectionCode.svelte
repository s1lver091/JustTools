<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Copy } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { code }: { code: string } = $props();

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(code);
			toast('Copied!');
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
			toast('Copied!');
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
		<Copy class="mr-1 size-3" />
		Copy
	</Button>
</div>
