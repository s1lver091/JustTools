<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
	import { Columns3, Regex, Hash, KeyRound, Braces } from '@lucide/svelte';

	type Resolvable = Parameters<typeof resolve>[0];

	const subTools = [
		{
			href: '/tools/dev/diff' as const,
			label: 'Text Diff',
			description: 'Compare two texts side by side with color-coded differences',
			icon: Columns3
		},
		{
			href: '/tools/dev/regex' as const,
			label: 'Regex Tester',
			description: 'Test regular expressions with live match highlighting',
			icon: Regex
		},
		{
			href: '/tools/dev/hash' as const,
			label: 'Hash Generator',
			description: 'Generate SHA hashes and encode/decode Base64, hex, and URLs',
			icon: Hash
		},
		{
			href: '/tools/dev/jwt' as const,
			label: 'JWT Inspector',
			description: 'Decode and inspect JWT tokens without verification',
			icon: KeyRound
		},
		{
			href: '/tools/dev/json' as const,
			label: 'JSON Tools',
			description: 'Format, minify, query, and convert JSON',
			icon: Braces
		}
	];
</script>

<ToolHeader
	title="Dev Tools"
	description="Text diff, regex tester, hash generator, JWT inspector, and JSON tools"
/>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each subTools as tool (tool.href)}
		{@const Icon = tool.icon}
		<a href={resolve(tool.href)} class="group block">
			<Card.Root class="transition-shadow group-hover:shadow-md">
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-orange-500/10 p-2">
							<Icon class="size-5 text-orange-500" />
						</div>
						<div>
							<Card.Title>{tool.label}</Card.Title>
							<Card.Description>{tool.description}</Card.Description>
						</div>
					</div>
				</Card.Header>
			</Card.Root>
		</a>
	{/each}
</div>
