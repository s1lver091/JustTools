<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Upload, Download, Shield } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	type Resolvable = Parameters<typeof resolve>[0];

	const options = [
		{
			title: 'Send Files',
			description: 'Select files and generate a connection code',
			href: '/tools/fileshare/send' as Resolvable,
			icon: Upload,
			color: 'bg-blue-500/10 text-blue-500'
		},
		{
			title: 'Receive Files',
			description: 'Enter a connection code to receive files',
			href: '/tools/fileshare/receive' as Resolvable,
			icon: Download,
			color: 'bg-green-500/10 text-green-500'
		}
	] as const;
</script>

<ToolHeader title="File Sharing" description="Share files peer-to-peer on your local network" />

<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
	{#each options as option (option.title)}
		{@const OptionIcon = option.icon}
		<a
			href={resolve(option.href)}
			class="focus-visible:ring-ring group block rounded-xl outline-none focus-visible:ring-2"
		>
			<Card.Root
				class="h-full transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-lg group-focus-visible:shadow-lg"
			>
				<Card.Header class="items-center text-center">
					<div
						class="mb-2 flex size-14 items-center justify-center rounded-xl {option.color}"
					>
						<OptionIcon class="size-7" />
					</div>
					<Card.Title class="text-lg">{option.title}</Card.Title>
				</Card.Header>
				<Card.Content class="text-center">
					<p class="text-muted-foreground text-sm">{option.description}</p>
				</Card.Content>
			</Card.Root>
		</a>
	{/each}
</div>

<div class="mt-8 space-y-3 text-center">
	<p class="text-muted-foreground text-sm">
		Files transfer directly between browsers. No server, no upload. Everything stays local.
	</p>
	<Badge variant="secondary" class="gap-1.5">
		<Shield class="size-3" />
		End-to-end encrypted (WebRTC DTLS)
	</Badge>
</div>
