<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Switch } from '$lib/components/ui/switch'
	import { Label } from '$lib/components/ui/label'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import {
		Download,
		ClipboardCopy,
		FileJson,
		Table,
		FileSpreadsheet,
		FolderOpen,
		Plus,
		Trash2,
		Columns3,
		ShieldCheck,
		BarChart3,
		Pencil,
		Merge
	} from '@lucide/svelte'

	interface Props {
		hasData: boolean
		onConvertTo: (format: 'json' | 'markdown' | 'tsv') => void
		onOpenFile: () => void
		onMergeFile: () => void
		onDownloadCsv: () => void
		onDownloadExcel: () => void
		onCopyClipboard: () => void
		onAddRow: () => void
		onDeleteRows: () => void
		onAddColumn: () => void
		onDeleteColumn: () => void
		onValidate: () => void
		onToggleStats: () => void
		hasSelectedRows: boolean
		showStats: boolean
		editorMode: boolean
		onToggleEditorMode: () => void
	}

	let {
		hasData,
		onConvertTo,
		onOpenFile,
		onMergeFile,
		onDownloadCsv,
		onDownloadExcel,
		onCopyClipboard,
		onAddRow,
		onDeleteRows,
		onAddColumn,
		onDeleteColumn,
		onValidate,
		onToggleStats,
		hasSelectedRows,
		showStats,
		editorMode,
		onToggleEditorMode
	}: Props = $props()
</script>

{#if hasData}
	<div class="flex flex-wrap items-center gap-2">
		<div class="flex items-center gap-2">
			<Switch id="editor-mode" checked={editorMode} onCheckedChange={onToggleEditorMode} />
			<Label for="editor-mode" class="flex items-center gap-1.5 text-sm">
				<Pencil class="size-3.5" />
				Editor
			</Label>
		</div>

		<div class="bg-border mx-1 h-6 w-px"></div>

		<Button variant="outline" size="sm" onclick={onOpenFile}>
			<FolderOpen class="mr-1.5 size-4" />
			Open
		</Button>

		<Button variant="outline" size="sm" onclick={onMergeFile}>
			<Merge class="mr-1.5 size-4" />
			Merge
		</Button>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						<Download class="mr-1.5 size-4" />
						Export to
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item onclick={onDownloadCsv}>
					<FileSpreadsheet class="mr-2 size-4" />
					CSV
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={onDownloadExcel}>
					<FileSpreadsheet class="mr-2 size-4" />
					Excel (.xlsx)
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onConvertTo('json')}>
					<FileJson class="mr-2 size-4" />
					JSON
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onConvertTo('markdown')}>
					<Table class="mr-2 size-4" />
					Markdown Table
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onConvertTo('tsv')}>
					<FileSpreadsheet class="mr-2 size-4" />
					TSV
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={onCopyClipboard}>
					<ClipboardCopy class="mr-2 size-4" />
					Copy to clipboard
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<div class="bg-border mx-1 h-6 w-px"></div>

		{#if editorMode}
			<Button variant="outline" size="sm" onclick={onAddRow}>
				<Plus class="mr-1.5 size-4" />
				Add Row
			</Button>
			<Button variant="outline" size="sm" onclick={onAddColumn}>
				<Columns3 class="mr-1.5 size-4" />
				Add Column
			</Button>
			<Button variant="outline" size="sm" onclick={onDeleteColumn}>
				<Trash2 class="mr-1.5 size-4" />
				Delete Column
			</Button>
		{/if}
		{#if hasSelectedRows}
			<Button variant="outline" size="sm" onclick={onDeleteRows}>
				<Trash2 class="mr-1.5 size-4" />
				Delete Rows
			</Button>
		{/if}

		{#if editorMode || hasSelectedRows}
			<div class="bg-border mx-1 h-6 w-px"></div>
		{/if}

		<Button variant="outline" size="sm" onclick={onValidate}>
			<ShieldCheck class="mr-1.5 size-4" />
			Validate
		</Button>
		<Button variant={showStats ? 'default' : 'outline'} size="sm" onclick={onToggleStats}>
			<BarChart3 class="mr-1.5 size-4" />
			Statistics
		</Button>
	</div>
{/if}
