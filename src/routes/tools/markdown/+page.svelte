<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import MarkdownPreview from '$lib/components/markdown/MarkdownPreview.svelte';
	import MarkdownToolbar from '$lib/components/markdown/MarkdownToolbar.svelte';
	import MarkdownExport from '$lib/components/markdown/MarkdownExport.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { codemirror } from '$lib/actions/codemirror';
	import type { EditorView } from '@codemirror/view';
	import type { KeyBinding } from '@codemirror/view';
	import { theme } from '$lib/stores/theme.svelte';
	import { parseMarkdown } from '$lib/utils/markdown';

	const DEBOUNCE_MS = 150;
	const AUTOSAVE_INTERVAL_MS = 5000;
	const AUTOSAVE_KEY = 'justtools-markdown-content';

	const SAMPLE_MARKDOWN = `# Welcome to the Markdown Editor

Write your Markdown here and see a **live preview** on the right.

## Features

- **Bold**, *italic*, and ~~strikethrough~~ text
- Headings (H1 through H6)
- Ordered and unordered lists
- [Links](https://example.com) and images
- Code blocks with syntax highlighting

### Code Example

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> Blockquotes look like this.

---

Enjoy writing!
`;

	function loadSavedContent(): string {
		try {
			const saved = localStorage.getItem(AUTOSAVE_KEY);
			if (saved !== null && saved.length > 0) return saved;
		} catch {
			// localStorage unavailable
		}
		return SAMPLE_MARKDOWN;
	}

	const initialContent = loadSavedContent();

	let content = $state(initialContent);
	let parsedHtml = $state(parseMarkdown(initialContent));
	let editorView = $state<EditorView | null>(null);
	let activeTab = $state<string>('editor');

	let dividerDragging = $state(false);
	let leftPaneWidth = $state(50);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// File I/O state
	let currentFilename = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);
	let savedContent = $state(initialContent);
	let confirmDialogOpen = $state(false);
	let pendingAction: (() => void) | null = null;
	let fileInputRef = $state<HTMLInputElement | null>(null);

	// Autosave state
	let lastAutoSavedContent = initialContent;
	let autoSaveIndicator = $state(false);

	// Scroll sync state
	let previewPaneRef = $state<HTMLElement | null>(null);
	let isSyncing = false;
	let scrollSyncEnabled = $state(true);

	// Responsive layout
	let isDesktop = $state(typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);

	$effect(() => {
		const mql = window.matchMedia('(min-width: 768px)');
		isDesktop = mql.matches;

		function handleChange(e: MediaQueryListEvent) {
			isDesktop = e.matches;
		}
		mql.addEventListener('change', handleChange);
		return () => mql.removeEventListener('change', handleChange);
	});

	// Word/character/line counts
	const wordCount = $derived(content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0);
	const charCount = $derived(content.length);
	const lineCount = $derived(content.split('\n').length);

	function handleEditorChange(value: string) {
		content = value;
		hasUnsavedChanges = value !== savedContent;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			parsedHtml = parseMarkdown(value);
		}, DEBOUNCE_MS);
	}

	function handleEditorReady(view: EditorView) {
		editorView = view;
		setupScrollSync(view);
	}

	// Autosave functions
	function saveToLocalStorage() {
		if (content === lastAutoSavedContent) return;
		try {
			localStorage.setItem(AUTOSAVE_KEY, content);
			lastAutoSavedContent = content;
			autoSaveIndicator = true;
			setTimeout(() => {
				autoSaveIndicator = false;
			}, 1500);
		} catch {
			console.error('Failed to save to localStorage');
		}
	}

	function clearAutoSave() {
		try {
			localStorage.removeItem(AUTOSAVE_KEY);
			lastAutoSavedContent = '';
		} catch {
			// localStorage unavailable
		}
	}

	$effect(() => {
		const timer = setInterval(saveToLocalStorage, AUTOSAVE_INTERVAL_MS);

		function handleBeforeUnload() {
			saveToLocalStorage();
		}
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			clearInterval(timer);
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	// Scroll sync functions
	function setupScrollSync(view: EditorView) {
		const scrollDOM = view.scrollDOM;

		scrollDOM.addEventListener('scroll', () => {
			if (!scrollSyncEnabled || isSyncing || !previewPaneRef) return;
			const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
			if (maxScroll <= 0) return;
			const percentage = scrollDOM.scrollTop / maxScroll;
			const previewMax = previewPaneRef.scrollHeight - previewPaneRef.clientHeight;
			if (previewMax <= 0) return;
			isSyncing = true;
			previewPaneRef.scrollTop = percentage * previewMax;
			requestAnimationFrame(() => {
				isSyncing = false;
			});
		});
	}

	function handlePreviewScroll() {
		if (!scrollSyncEnabled || isSyncing || !editorView || !previewPaneRef) return;
		const maxScroll = previewPaneRef.scrollHeight - previewPaneRef.clientHeight;
		if (maxScroll <= 0) return;
		const percentage = previewPaneRef.scrollTop / maxScroll;
		const scrollDOM = editorView.scrollDOM;
		const editorMax = scrollDOM.scrollHeight - scrollDOM.clientHeight;
		if (editorMax <= 0) return;
		isSyncing = true;
		scrollDOM.scrollTop = percentage * editorMax;
		requestAnimationFrame(() => {
			isSyncing = false;
		});
	}

	function setContent(value: string) {
		content = value;
		savedContent = value;
		hasUnsavedChanges = false;
		parsedHtml = parseMarkdown(value);
	}

	function handleToggleCheckbox(index: number) {
		let count = 0;
		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const unchecked = lines[i].match(/^(\s*-\s*)\[ \]/);
			const checked = lines[i].match(/^(\s*-\s*)\[x\]/i);
			if (unchecked || checked) {
				if (count === index) {
					if (unchecked) {
						lines[i] = lines[i].replace(/\[ \]/, '[x]');
					} else {
						lines[i] = lines[i].replace(/\[x\]/i, '[ ]');
					}
					const newContent = lines.join('\n');
					content = newContent;
					hasUnsavedChanges = newContent !== savedContent;
					parsedHtml = parseMarkdown(newContent);
					return;
				}
				count++;
			}
		}
	}

	function confirmOrExecute(action: () => void) {
		if (hasUnsavedChanges) {
			pendingAction = action;
			confirmDialogOpen = true;
		} else {
			action();
		}
	}

	function handleConfirmDiscard() {
		confirmDialogOpen = false;
		pendingAction?.();
		pendingAction = null;
	}

	function handleCancelDiscard() {
		confirmDialogOpen = false;
		pendingAction = null;
	}

	function handleNew() {
		confirmOrExecute(() => {
			setContent('');
			currentFilename = null;
			clearAutoSave();
		});
	}

	function handleOpen() {
		confirmOrExecute(() => {
			fileInputRef?.click();
		});
	}

	function handleFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		file.text().then((text) => {
			setContent(text);
			currentFilename = file.name;
		});
		input.value = '';
	}

	async function handleSave() {
		const filename = currentFilename ?? 'document.md';
		if ('showSaveFilePicker' in window) {
			try {
				const handle = await (window as any).showSaveFilePicker({
					suggestedName: filename,
					types: [
						{
							description: 'Markdown Files',
							accept: { 'text/markdown': ['.md'] }
						}
					]
				});
				const writable = await handle.createWritable();
				await writable.write(content);
				await writable.close();
				savedContent = content;
				hasUnsavedChanges = false;
				currentFilename = handle.name;
			} catch {
				// User cancelled the save dialog
			}
		} else {
			const blob = new Blob([content], { type: 'text/markdown' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
			savedContent = content;
			hasUnsavedChanges = false;
		}
	}

	function wrapSelectionFromView(view: EditorView, before: string, after: string): boolean {
		const { from, to } = view.state.selection.main;
		const selected = view.state.sliceDoc(from, to);
		if (selected) {
			view.dispatch({
				changes: { from, to, insert: `${before}${selected}${after}` },
				selection: { anchor: from + before.length, head: to + before.length }
			});
		} else {
			view.dispatch({
				changes: { from, insert: `${before}${after}` },
				selection: { anchor: from + before.length }
			});
		}
		return true;
	}

	function insertLinkFromView(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		const selected = view.state.sliceDoc(from, to);
		if (selected) {
			view.dispatch({
				changes: { from, to, insert: `[${selected}](url)` },
				selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 }
			});
		} else {
			view.dispatch({
				changes: { from, insert: '[text](url)' },
				selection: { anchor: from + 1, head: from + 5 }
			});
		}
		return true;
	}

	const extraKeys: KeyBinding[] = [
		{ key: 'Mod-b', run: (view) => wrapSelectionFromView(view, '**', '**') },
		{ key: 'Mod-i', run: (view) => wrapSelectionFromView(view, '*', '*') },
		{ key: 'Mod-k', run: (view) => insertLinkFromView(view) },
		{
			key: 'Mod-s',
			run: () => {
				handleSave();
				return true;
			},
			preventDefault: true
		},
		{
			key: 'Mod-o',
			run: () => {
				handleOpen();
				return true;
			},
			preventDefault: true
		}
	];

	function handleDividerPointerDown(e: PointerEvent) {
		dividerDragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handleDividerPointerMove(e: PointerEvent) {
		if (!dividerDragging) return;
		const container = (e.target as HTMLElement).parentElement;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const percentage = ((e.clientX - rect.left) / rect.width) * 100;
		leftPaneWidth = Math.min(80, Math.max(20, percentage));
	}

	function handleDividerPointerUp() {
		dividerDragging = false;
	}
</script>

<!-- Hidden file input for Open -->
<input
	bind:this={fileInputRef}
	type="file"
	accept=".md,.txt,.markdown"
	class="hidden"
	onchange={handleFileSelected}
/>

<!-- Unsaved changes confirmation dialog -->
<AlertDialog.Root bind:open={confirmDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Unsaved Changes</AlertDialog.Title>
			<AlertDialog.Description>
				You have unsaved changes. Are you sure you want to continue? Your changes will be lost.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancelDiscard}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleConfirmDiscard}>Discard Changes</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<div class="tool-header">
	<ToolHeader
		title="Markdown Editor"
		description="Write, preview, and export Markdown documents{currentFilename ? ` - ${currentFilename}` : ''}{hasUnsavedChanges ? ' (unsaved)' : ''}"
	/>
</div>

<!-- Toolbar -->
<div class="toolbar border-border mb-2 rounded-lg border bg-white/50 p-1 dark:bg-zinc-950/50">
	<div class="flex items-center justify-between">
		<MarkdownToolbar {editorView} onNew={handleNew} onOpen={handleOpen} onSave={handleSave} />
		<MarkdownExport html={parsedHtml} filename={currentFilename ?? 'document'} />
	</div>
</div>

{#if isDesktop}
	<!-- Desktop: side-by-side split pane -->
	<div class="editor-container flex flex-1 overflow-hidden" style="height: calc(100vh - 220px);">
		<!-- Editor pane -->
		<div class="editor-pane flex flex-col overflow-hidden" style="width: {leftPaneWidth}%;">
			<div
				class="h-full overflow-hidden rounded-l-lg border"
				use:codemirror={{
					value: content,
					onChange: handleEditorChange,
					onReady: handleEditorReady,
					darkMode: theme.isDark,
					extraKeys
				}}
			></div>
		</div>

		<!-- Resizable divider -->
		<div
			class="divider bg-border hover:bg-primary/50 flex w-1 cursor-col-resize items-center justify-center transition-colors {dividerDragging
				? 'bg-primary/50'
				: ''}"
			role="separator"
			aria-orientation="vertical"
			onpointerdown={handleDividerPointerDown}
			onpointermove={handleDividerPointerMove}
			onpointerup={handleDividerPointerUp}
		>
			<div class="bg-muted-foreground/50 h-8 w-0.5 rounded-full"></div>
		</div>

		<!-- Preview pane -->
		<div
			bind:this={previewPaneRef}
			class="preview-pane border-border overflow-y-auto rounded-r-lg border bg-white p-6 dark:bg-zinc-950"
			style="width: {100 - leftPaneWidth}%;"
			onscroll={handlePreviewScroll}
		>
			<MarkdownPreview html={parsedHtml} onToggleCheckbox={handleToggleCheckbox} />
		</div>
	</div>
{:else}
	<!-- Mobile: tabbed view -->
	<div class="mobile-tabs flex flex-1 flex-col" style="height: calc(100vh - 220px);">
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="mb-2 w-full">
				<Tabs.Trigger value="editor" class="flex-1">Editor</Tabs.Trigger>
				<Tabs.Trigger value="preview" class="flex-1">Preview</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="editor" class="flex-1">
				<div
					class="min-h-[400px] overflow-hidden rounded-lg border"
					use:codemirror={{
						value: content,
						onChange: handleEditorChange,
						onReady: handleEditorReady,
						darkMode: theme.isDark,
						extraKeys
					}}
				></div>
			</Tabs.Content>

			<Tabs.Content value="preview" class="flex-1">
				<div class="border-border overflow-y-auto rounded-lg border bg-white p-6 dark:bg-zinc-950">
					<MarkdownPreview html={parsedHtml} onToggleCheckbox={handleToggleCheckbox} />
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</div>
{/if}

<!-- Status bar -->
<div class="status-bar text-muted-foreground mt-2 flex min-h-[24px] items-center justify-end gap-3 px-2 text-xs">
	{#if autoSaveIndicator}
		<span class="text-green-600 dark:text-green-400">Saved</span>
	{/if}
	<span>{wordCount} words</span>
	<span class="text-muted-foreground/50">·</span>
	<span>{charCount} chars</span>
	<span class="text-muted-foreground/50">·</span>
	<span>{lineCount} lines</span>
</div>

<style>
	@media print {
		:global(header),
		:global(nav),
		:global(aside),
		:global(.sidebar),
		.tool-header {
			display: none !important;
		}

		:global(main) {
			padding: 0 !important;
			margin: 0 !important;
		}

		.toolbar,
		.editor-pane,
		.divider,
		.status-bar,
		.mobile-tabs {
			display: none !important;
		}

		.editor-container {
			display: block !important;
			height: auto !important;
		}

		.preview-pane {
			width: 100% !important;
			margin: 0 !important;
			padding: 20mm !important;
			border: none !important;
			box-shadow: none !important;
			border-radius: 0 !important;
			overflow: visible !important;
		}

		.preview-pane :global(h1),
		.preview-pane :global(h2) {
			break-before: auto;
		}

		.preview-pane :global(pre),
		.preview-pane :global(table),
		.preview-pane :global(img) {
			break-inside: avoid;
		}
	}
</style>
