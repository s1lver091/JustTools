<script lang="ts">
	import type { EditorView } from '@codemirror/view';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Bold,
		Italic,
		Strikethrough,
		Heading,
		List,
		ListOrdered,
		ListChecks,
		Link,
		ImageIcon,
		Code,
		FileCode2,
		Quote,
		Minus,
		FilePlus,
		FolderOpen,
		Download,
		Table
	} from '@lucide/svelte';

	interface Props {
		editorView: EditorView | null;
		onNew?: () => void;
		onOpen?: () => void;
		onSave?: () => void;
	}

	let { editorView, onNew, onOpen, onSave }: Props = $props();

	function wrapSelection(before: string, after: string) {
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		const selected = editorView.state.sliceDoc(from, to);

		if (selected) {
			editorView.dispatch({
				changes: { from, to, insert: `${before}${selected}${after}` },
				selection: { anchor: from + before.length, head: to + before.length }
			});
		} else {
			editorView.dispatch({
				changes: { from, insert: `${before}${after}` },
				selection: { anchor: from + before.length }
			});
		}
		editorView.focus();
	}

	function prefixLine(prefix: string) {
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		const line = editorView.state.doc.lineAt(from);
		editorView.dispatch({
			changes: { from: line.from, to: line.from, insert: prefix },
			selection: { anchor: from + prefix.length, head: to + prefix.length }
		});
		editorView.focus();
	}

	function insertBlock(text: string, cursorOffset?: number) {
		if (!editorView) return;
		const { from } = editorView.state.selection.main;
		editorView.dispatch({
			changes: { from, insert: text },
			selection: { anchor: from + (cursorOffset ?? text.length) }
		});
		editorView.focus();
	}

	function insertHeading(level: number) {
		const prefix = '#'.repeat(level) + ' ';
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		const line = editorView.state.doc.lineAt(from);
		const existingMatch = line.text.match(/^#{1,6}\s/);

		if (existingMatch) {
			const diff = prefix.length - existingMatch[0].length;
			editorView.dispatch({
				changes: { from: line.from, to: line.from + existingMatch[0].length, insert: prefix },
				selection: { anchor: from + diff, head: to + diff }
			});
		} else {
			editorView.dispatch({
				changes: { from: line.from, to: line.from, insert: prefix },
				selection: { anchor: from + prefix.length, head: to + prefix.length }
			});
		}
		editorView.focus();
	}

	function insertLink() {
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		const selected = editorView.state.sliceDoc(from, to);

		if (selected) {
			editorView.dispatch({
				changes: { from, to, insert: `[${selected}](url)` },
				selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 }
			});
		} else {
			editorView.dispatch({
				changes: { from, insert: '[text](url)' },
				selection: { anchor: from + 1, head: from + 5 }
			});
		}
		editorView.focus();
	}

	function insertImage() {
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		const selected = editorView.state.sliceDoc(from, to);

		if (selected) {
			editorView.dispatch({
				changes: { from, to, insert: `![${selected}](url)` },
				selection: { anchor: from + selected.length + 4, head: from + selected.length + 7 }
			});
		} else {
			editorView.dispatch({
				changes: { from, insert: '![alt](url)' },
				selection: { anchor: from + 2, head: from + 5 }
			});
		}
		editorView.focus();
	}

	const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

	type ToolbarButton = {
		label: string;
		icon: typeof Bold;
		action: () => void;
		shortcut?: string;
	};

	const buttons: ToolbarButton[] = [
		{ label: 'Bold', icon: Bold, action: () => wrapSelection('**', '**'), shortcut: 'Ctrl+B' },
		{ label: 'Italic', icon: Italic, action: () => wrapSelection('*', '*'), shortcut: 'Ctrl+I' },
		{
			label: 'Strikethrough',
			icon: Strikethrough,
			action: () => wrapSelection('~~', '~~')
		},
		{
			label: 'Inline Code',
			icon: Code,
			action: () => wrapSelection('`', '`')
		},
		{ label: 'Link', icon: Link, action: insertLink, shortcut: 'Ctrl+K' },
		{ label: 'Image', icon: ImageIcon, action: insertImage }
	];

	const TABLE_TEMPLATE = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;

	const blockButtons: ToolbarButton[] = [
		{ label: 'Unordered List', icon: List, action: () => prefixLine('- ') },
		{ label: 'Ordered List', icon: ListOrdered, action: () => prefixLine('1. ') },
		{ label: 'Task List', icon: ListChecks, action: () => prefixLine('- [ ] ') },
		{ label: 'Blockquote', icon: Quote, action: () => prefixLine('> ') },
		{
			label: 'Code Block',
			icon: FileCode2,
			action: () => insertBlock('```\n\n```\n', 4)
		},
		{ label: 'Table', icon: Table, action: () => insertBlock('\n' + TABLE_TEMPLATE) },
		{ label: 'Horizontal Rule', icon: Minus, action: () => insertBlock('\n---\n') }
	];
</script>

<div class="flex flex-wrap items-center gap-0.5">
	<!-- File operations -->
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="icon" class="h-8 w-8" {...props} onclick={onNew}>
					<FilePlus class="size-4" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content><p>New Document</p></Tooltip.Content>
	</Tooltip.Root>

	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="icon" class="h-8 w-8" {...props} onclick={onOpen}>
					<FolderOpen class="size-4" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content><p>Open File (Ctrl+O)</p></Tooltip.Content>
	</Tooltip.Root>

	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="icon" class="h-8 w-8" {...props} onclick={onSave}>
					<Download class="size-4" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content><p>Save File (Ctrl+S)</p></Tooltip.Content>
	</Tooltip.Root>

	<div class="bg-border mx-1 h-5 w-px"></div>

	<!-- Heading dropdown -->
	<DropdownMenu.Root>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props: tooltipProps })}
					<DropdownMenu.Trigger>
						{#snippet child({ props: menuProps })}
							<Button variant="ghost" size="icon" class="h-8 w-8" {...tooltipProps} {...menuProps}>
								<Heading class="size-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content><p>Heading</p></Tooltip.Content>
		</Tooltip.Root>

		<DropdownMenu.Content>
			{#each HEADING_LEVELS as level}
				<DropdownMenu.Item onclick={() => insertHeading(level)}>
					Heading {level}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<div class="bg-border mx-1 h-5 w-px"></div>

	<!-- Inline formatting buttons -->
	{#each buttons as btn}
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button variant="ghost" size="icon" class="h-8 w-8" {...props} onclick={btn.action}>
						<btn.icon class="size-4" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>{btn.label}{btn.shortcut ? ` (${btn.shortcut})` : ''}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	{/each}

	<div class="bg-border mx-1 h-5 w-px"></div>

	<!-- Block formatting buttons -->
	{#each blockButtons as btn}
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button variant="ghost" size="icon" class="h-8 w-8" {...props} onclick={btn.action}>
						<btn.icon class="size-4" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>{btn.label}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	{/each}
</div>
