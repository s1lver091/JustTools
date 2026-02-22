<script lang="ts">
	let { size = 'md' }: { size?: 'sm' | 'md' | 'lg' } = $props();

	const sizeClasses = {
		sm: 'size-5 border-2',
		md: 'size-8 border-[3px]',
		lg: 'size-12 border-4'
	} as const;
</script>

<div class="flex items-center justify-center" role="status" aria-label="Loading">
	<div
		class="border-primary/30 border-t-primary animate-spin rounded-full {sizeClasses[size]}"
	></div>
</div>
