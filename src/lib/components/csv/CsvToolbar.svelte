<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import {
		Download,
		ClipboardCopy,
		FileJson,
		Table,
		FileSpreadsheet,
		Upload,
		Plus,
		Trash2,
		Columns3,
		ShieldCheck,
		BarChart3
	} from '@lucide/svelte'

	interface Props {
		hasData: boolean
		onConvertTo: (format: 'json' | 'markdown' | 'tsv') => void
		onImportJson: () => void
		onDownloadCsv: () => void
		onCopyClipboard: () => void
		onAddRow: () => void
		onDeleteRows: () => void
		onAddColumn: () => void
		onDeleteColumn: () => void
		onValidate: () => void
		onToggleStats: () => void
		hasSelectedRows: boolean
		showStats: boolean
	}

	let {
		hasData,
		onConvertTo,
		onImportJson,
		onDownloadCsv,
		onCopyClipboard,
		onAddRow,
		onDeleteRows,
		onAddColumn,
		onDeleteColumn,
		onValidate,
		onToggleStats,
		hasSelectedRows,
		showStats
	}: Props = $props()
</script>

{#if hasData}
	<div class="flex flex-wrap items-center gap-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						<FileSpreadsheet class="mr-1.5 size-4" />
						Convert to
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
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
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Button variant="outline" size="sm" onclick={onImportJson}>
			<Upload class="mr-1.5 size-4" />
			Import JSON
		</Button>

		<div class="bg-border mx-1 h-6 w-px"></div>

		<Button variant="outline" size="sm" onclick={onAddRow}>
			<Plus class="mr-1.5 size-4" />
			Add Row
		</Button>
		<Button variant="outline" size="sm" onclick={onAddColumn}>
			<Columns3 class="mr-1.5 size-4" />
			Add Column
		</Button>
		{#if hasSelectedRows}
			<Button variant="outline" size="sm" onclick={onDeleteRows}>
				<Trash2 class="mr-1.5 size-4" />
				Delete Rows
			</Button>
		{/if}
		<Button variant="outline" size="sm" onclick={onDeleteColumn}>
			<Trash2 class="mr-1.5 size-4" />
			Delete Column
		</Button>

		<div class="bg-border mx-1 h-6 w-px"></div>

		<Button variant="outline" size="sm" onclick={onValidate}>
			<ShieldCheck class="mr-1.5 size-4" />
			Validate
		</Button>
		<Button variant={showStats ? 'default' : 'outline'} size="sm" onclick={onToggleStats}>
			<BarChart3 class="mr-1.5 size-4" />
			Statistics
		</Button>

		<div class="bg-border mx-1 h-6 w-px"></div>

		<Button variant="outline" size="sm" onclick={onDownloadCsv}>
			<Download class="mr-1.5 size-4" />
			Download CSV
		</Button>
		<Button variant="outline" size="sm" onclick={onCopyClipboard}>
			<ClipboardCopy class="mr-1.5 size-4" />
			Copy
		</Button>
	</div>
{/if}
