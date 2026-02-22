<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { tools } from '$lib/tools';
	import { resolve } from '$app/paths';
	import { Zap, Lock, Globe, Sparkles } from '@lucide/svelte';

	// Helper to cast dynamic string hrefs to the route type resolve() expects
	type Resolvable = Parameters<typeof resolve>[0];
</script>

<svelte:head>
	<title>JustTools | Browser-based productivity tools</title>
	<meta
		name="description"
		content="A collection of lightweight, privacy-first tools that run entirely in your browser."
	/>
</svelte:head>

<!-- Hero -->
<section class="mx-auto max-w-3xl pt-8 pb-14 text-center">
	<div
		class="bg-primary/10 text-primary mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
	>
		<Zap class="size-3.5" />
		100% client-side, no sign-up required
	</div>

	<h1 class="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
		Your browser-based<br />
		<span class="text-primary">productivity toolkit</span>
	</h1>

	<p class="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
		JustTools is a collection of lightweight utilities that run entirely in your browser. No file
		uploads, no accounts. Just open and use.
	</p>

	<!-- Feature pills -->
	<div class="mt-8 flex flex-wrap justify-center gap-3">
		{#each [
			{ icon: Lock, label: 'Private by design' },
			{ icon: Globe, label: 'Works offline' },
			{ icon: Zap, label: 'Instant, no install' }
		] as feature (feature.label)}
			{@const FeatureIcon = feature.icon}
			<span
				class="border-border bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
			>
				<FeatureIcon class="size-3.5" />
				{feature.label}
			</span>
		{/each}
	</div>
</section>

<!-- Tools grid -->
<section class="mx-auto max-w-5xl">
	<h2 class="text-muted-foreground mb-6 text-center text-sm font-semibold uppercase tracking-widest">
		Available tools
	</h2>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
		{#each tools as tool (tool.id)}
			{@const ToolIcon = tool.icon}
			<a
				href={resolve(tool.href as Resolvable)}
				class="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Card.Root
					class="h-full transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-lg group-focus-visible:shadow-lg"
				>
					<Card.Header class="items-center text-center">
						<div class="mb-2 flex size-14 items-center justify-center rounded-xl {tool.color}">
							<ToolIcon class="size-7" />
						</div>
						<Card.Title class="text-base">{tool.name}</Card.Title>
					</Card.Header>
					<Card.Content class="text-center">
						<p class="text-muted-foreground text-sm">{tool.description}</p>
					</Card.Content>
				</Card.Root>
			</a>
		{/each}

		<!-- Coming soon placeholder -->
		<div class="rounded-xl">
			<Card.Root class="h-full border-dashed opacity-55 select-none">
				<Card.Header class="items-center text-center">
					<div
						class="bg-muted text-muted-foreground mb-2 flex size-14 items-center justify-center rounded-xl"
					>
						<Sparkles class="size-7" />
					</div>
					<Card.Title class="text-muted-foreground text-base">Coming soon</Card.Title>
				</Card.Header>
				<Card.Content class="text-center">
					<p class="text-muted-foreground text-sm italic">New tools are being built.</p>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>
