<script lang="ts">
	let { title, description }: { title: string; description: string } = $props();
</script>

<div class="mb-6">
	<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
	<p class="text-muted-foreground mt-1 text-lg">{description}</p>
</div>
