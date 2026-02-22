import {
	FileText,
	FileCode,
	ImageIcon,
	Share2,
	Merge,
	Scissors,
	FileDown,
	FileImage,
	Highlighter,
	PenLine,
	Layers,
	FilePen
} from '@lucide/svelte';
import type { Component } from 'svelte';

export interface SubTool {
	id: string;
	name: string;
	href: string;
	icon: Component;
	description: string;
}

export interface Tool {
	id: string;
	name: string;
	href: string;
	icon: Component;
	description: string;
	/** Tailwind color classes applied to the icon badge (bg + text) */
	color: string;
	subTools?: SubTool[];
}

export interface SearchableItem {
	name: string;
	href: string;
	icon: Component;
	description: string;
	category?: string;
}

/**
 * Central registry of all available tools.
 *
 * To add a new tool:
 *  1. Import its icon from @lucide/svelte (or any Svelte component).
 *  2. Add an entry below.
 *  3. Create the matching route under src/routes/tools/<id>/+page.svelte.
 *
 * That's it. The homepage and sidebar are automatically updated.
 */
export const tools: Tool[] = [
	{
		id: 'pdf',
		name: 'PDF Editor',
		href: '/tools/pdf',
		icon: FileText,
		description: 'Merge, split, compress, annotate and edit PDF files, all without file uploads.',
		color: 'bg-red-500/10 text-red-500',
		subTools: [
			{
				id: 'pdf-merge',
				name: 'Merge PDFs',
				href: '/tools/pdf/merge',
				icon: Merge,
				description: 'Combine multiple PDF files into one'
			},
			{
				id: 'pdf-split',
				name: 'Split PDF',
				href: '/tools/pdf/split',
				icon: Scissors,
				description: 'Extract pages or split into parts'
			},
			{
				id: 'pdf-compress',
				name: 'Compress PDF',
				href: '/tools/pdf/compress',
				icon: FileDown,
				description: 'Reduce file size by recompression'
			},
			{
				id: 'pdf-convert',
				name: 'Convert PDF',
				href: '/tools/pdf/convert',
				icon: FileImage,
				description: 'Convert between PDF and images'
			},
			{
				id: 'pdf-annotate',
				name: 'Annotate PDF',
				href: '/tools/pdf/annotate',
				icon: Highlighter,
				description: 'Highlight, draw, and add notes'
			},
			{
				id: 'pdf-edit',
				name: 'Edit PDF Text',
				href: '/tools/pdf/edit',
				icon: PenLine,
				description: 'Edit text inline'
			},
			{
				id: 'pdf-pages',
				name: 'Page Manager',
				href: '/tools/pdf/pages',
				icon: Layers,
				description: 'Rotate, delete, and reorder pages'
			},
			{
				id: 'pdf-sign',
				name: 'Sign PDF',
				href: '/tools/pdf/sign',
				icon: FilePen,
				description: 'Add a handwritten or typed signature'
			}
		]
	},
	{
		id: 'markdown',
		name: 'Markdown Editor',
		href: '/tools/markdown',
		icon: FileCode,
		description: 'Write, preview, and export Markdown documents with live syntax highlighting.',
		color: 'bg-blue-500/10 text-blue-500'
	},
	{
		id: 'image',
		name: 'Image Editor',
		href: '/tools/image',
		icon: ImageIcon,
		description: 'Crop, resize, compress, adjust, and convert images. No server involved.',
		color: 'bg-green-500/10 text-green-500'
	},
	{
		id: 'fileshare',
		name: 'File Sharing',
		href: '/tools/fileshare',
		icon: Share2,
		description: 'Transfer files peer-to-peer on your local network using WebRTC.',
		color: 'bg-purple-500/10 text-purple-500'
	}
];

export const searchableItems: SearchableItem[] = tools.flatMap((tool) => {
	const main: SearchableItem = {
		name: tool.name,
		href: tool.href,
		icon: tool.icon,
		description: tool.description
	};
	const subs: SearchableItem[] = (tool.subTools ?? []).map((sub) => ({
		name: sub.name,
		href: sub.href,
		icon: sub.icon,
		description: sub.description,
		category: tool.name
	}));
	return [main, ...subs];
});
