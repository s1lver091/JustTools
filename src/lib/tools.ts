import { FileText, FileCode, ImageIcon, Share2 } from '@lucide/svelte';
import type { Component } from 'svelte';

export interface Tool {
	id: string;
	name: string;
	href: string;
	icon: Component;
	description: string;
	/** Tailwind color classes applied to the icon badge (bg + text) */
	color: string;
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
		color: 'bg-red-500/10 text-red-500'
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
