<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Share, Printer, FileDown, ClipboardCopy } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { downloadBlob } from '$lib/utils/download';

	interface Props {
		html: string;
		filename?: string;
	}

	let { html, filename = 'document' }: Props = $props();

	function getPreviewStyles(): string {
		return `
			body {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
				line-height: 1.625;
				color: #1a1a1a;
				max-width: 800px;
				margin: 0 auto;
				padding: 2rem;
			}
			h1 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; }
			h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.75rem; }
			h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
			h4 { font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
			h5 { font-size: 1rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; }
			h6 { font-size: 0.875rem; font-weight: 600; color: #666; margin-top: 0.75rem; margin-bottom: 0.25rem; }
			p { margin-bottom: 1rem; line-height: 1.75; }
			a { color: #2563eb; text-decoration: underline; }
			strong { font-weight: 600; }
			em { font-style: italic; }
			del { text-decoration: line-through; color: #666; }
			blockquote { border-left: 4px solid #ddd; color: #666; margin: 1rem 0; padding-left: 1rem; font-style: italic; }
			ul { margin: 1rem 0; margin-left: 1.5rem; list-style-type: disc; }
			ol { margin: 1rem 0; margin-left: 1.5rem; list-style-type: decimal; }
			li { margin-bottom: 0.25rem; line-height: 1.75; }
			code { background: #f4f4f5; border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-family: monospace; font-size: 0.875rem; }
			pre { background: #f4f4f5; margin: 1rem 0; overflow-x: auto; border-radius: 0.5rem; padding: 1rem; }
			pre code { background: transparent; padding: 0; border-radius: 0; }
			hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
			table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
			th { background: #f4f4f5; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; }
			td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; }
			tr:nth-child(even) { background: #fafafa; }
			img { max-width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
			.hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-name, .hljs-tag { color: #6f42c1; }
			.hljs-string, .hljs-title, .hljs-attribute, .hljs-literal, .hljs-type, .hljs-addition { color: #22863a; }
			.hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #6a737d; }
			.hljs-number, .hljs-regexp, .hljs-variable, .hljs-link { color: #e36209; }
			.hljs-symbol, .hljs-bullet { color: #6f42c1; }
		`;
	}

	function handlePrint() {
		window.print();
	}

	function handleExportHtml() {
		const title = filename.replace(/\.md$/, '');
		const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title}</title>
	<style>${getPreviewStyles()}</style>
</head>
<body>
${html}
</body>
</html>`;

		const blob = new Blob([fullHtml], { type: 'text/html' });
		downloadBlob(blob, `${title}.html`);
	}

	async function handleCopyHtml() {
		try {
			await navigator.clipboard.writeText(html);
			toast('Copied!');
		} catch {
			// clipboard write failed silently
		}
	}
</script>

<DropdownMenu.Root>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props: tooltipProps })}
				<DropdownMenu.Trigger>
					{#snippet child({ props: menuProps })}
						<Button variant="ghost" size="icon" class="h-8 w-8" {...tooltipProps} {...menuProps}>
							<Share class="size-4" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content><p>Export</p></Tooltip.Content>
	</Tooltip.Root>

	<DropdownMenu.Content>
		<DropdownMenu.Item onclick={handlePrint}>
			<Printer class="mr-2 size-4" />
			Print / Save as PDF
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={handleExportHtml}>
			<FileDown class="mr-2 size-4" />
			Export as HTML
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={handleCopyHtml}>
			<ClipboardCopy class="mr-2 size-4" />
			Copy HTML to Clipboard
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
