<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import {
		Crop,
		SlidersHorizontal,
		ArrowRightLeft,
		Info,
		Pipette,
		ScanText,
		FolderSync
	} from '@lucide/svelte';

	const subTools = [
		{
			href: '/tools/image/editor' as const,
			label: 'Edit Image',
			description: 'Crop, rotate, flip, and resize images',
			icon: Crop
		},
		{
			href: '/tools/image/adjust' as const,
			label: 'Adjustments',
			description: 'Brightness, contrast, filters, and more',
			icon: SlidersHorizontal
		},
		{
			href: '/tools/image/convert' as const,
			label: 'Convert & Export',
			description: 'Change format and compress images',
			icon: ArrowRightLeft
		},
		{
			href: '/tools/image/exif' as const,
			label: 'EXIF Data',
			description: 'View and remove image metadata',
			icon: Info
		},
		{
			href: '/tools/image/colorpicker' as const,
			label: 'Color Picker',
			description: 'Pick colors from any image',
			icon: Pipette
		},
		{
			href: '/tools/image/text' as const,
			label: 'Text Extraction (OCR)',
			description: 'Extract text from images with OCR',
			icon: ScanText
		},
		{
			href: '/tools/image/batch' as const,
			label: 'Batch Processing',
			description: 'Apply operations to multiple images',
			icon: FolderSync
		}
	];
</script>

<ToolHeader
	title="Image Editor"
	description="Crop, resize, compress, adjust, and convert images"
/>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each subTools as tool (tool.href)}
		{@const Icon = tool.icon}
		<a href={resolve(tool.href)} class="group block">
			<Card.Root class="transition-shadow group-hover:shadow-md">
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="bg-green-500/10 rounded-lg p-2">
							<Icon class="size-5 text-green-500" />
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
