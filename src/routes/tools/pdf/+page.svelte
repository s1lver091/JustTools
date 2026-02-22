<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import {
		Merge,
		Scissors,
		FileDown,
		FileImage,
		Highlighter,
		PenLine,
		Layers,
		FilePen
	} from '@lucide/svelte';

	const subTools = [
		{
			href: '/tools/pdf/merge' as const,
			label: 'Merge',
			description: 'Combine multiple PDF files into one',
			icon: Merge
		},
		{
			href: '/tools/pdf/split' as const,
			label: 'Split',
			description: 'Extract pages or split into parts',
			icon: Scissors
		},
		{
			href: '/tools/pdf/compress' as const,
			label: 'Compress',
			description: 'Reduce file size by recompression',
			icon: FileDown
		},
		{
			href: '/tools/pdf/convert' as const,
			label: 'Convert',
			description: 'Convert between PDF and images',
			icon: FileImage
		},
		{
			href: '/tools/pdf/annotate' as const,
			label: 'Annotate',
			description: 'Highlight, draw, and add notes',
			icon: Highlighter
		},
		{
			href: '/tools/pdf/edit' as const,
			label: 'Edit',
			description: 'Edit text inline',
			icon: PenLine
		},
		{
			href: '/tools/pdf/pages' as const,
			label: 'Page Manager',
			description: 'Rotate, delete, and reorder pages',
			icon: Layers
		},
		{
			href: '/tools/pdf/sign' as const,
			label: 'Sign',
			description: 'Add a handwritten or typed signature',
			icon: FilePen
		}
	];
</script>

<ToolHeader title="PDF Editor" description="Merge, split, compress, annotate, and edit PDFs" />

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each subTools as tool (tool.href)}
		{@const Icon = tool.icon}
		<a href={resolve(tool.href)} class="group block">
			<Card.Root class="transition-shadow group-hover:shadow-md">
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="bg-red-500/10 rounded-lg p-2">
							<Icon class="size-5 text-red-500" />
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