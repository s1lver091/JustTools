<script lang="ts">
	type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'error';

	let { state }: { state: ConnectionState } = $props();

	const config = {
		new: { color: 'bg-gray-400', label: 'Not connected' },
		connecting: { color: 'bg-yellow-400 animate-pulse', label: 'Connecting...' },
		connected: { color: 'bg-green-500', label: 'Connected' },
		disconnected: { color: 'bg-gray-400', label: 'Disconnected' },
		error: { color: 'bg-red-500', label: 'Connection error' }
	} as const;

	const current = $derived(config[state]);
</script>

<div
	class="mb-4 flex items-center gap-2 text-sm"
	role="status"
	aria-live="polite"
>
	<span class="inline-block size-2.5 rounded-full {current.color}"></span>
	<span class="text-muted-foreground">{current.label}</span>
</div>
