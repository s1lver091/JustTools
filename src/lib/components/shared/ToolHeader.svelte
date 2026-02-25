<script lang="ts">
	let { title, description }: { title: string; description: string } = $props();
</script>

<div class="mb-4 sm:mb-6">
	<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
	<p class="text-muted-foreground mt-1 text-sm sm:text-lg">{description}</p>
</div>
