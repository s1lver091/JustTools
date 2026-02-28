<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte'
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte'
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
	import CsvTable from '$lib/components/csv/CsvTable.svelte'
	import CsvToolbar from '$lib/components/csv/CsvToolbar.svelte'
	import CsvStats from '$lib/components/csv/CsvStats.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { parseCsv, serializeCsv, validateCsv } from '$lib/utils/csv-parser'
	import { csvToJson, csvToMarkdown, csvToTsv, jsonToCsv } from '$lib/utils/csv-convert'
	import { createTypedWorker } from '$lib/workers/worker-utils'
	import type { ParseResult, CsvIssue } from '$lib/utils/csv-parser'
	import { X, ClipboardCopy, Download, AlertTriangle, CheckCircle } from '@lucide/svelte'

	const WORKER_THRESHOLD = 1_048_576 // 1 MB

	let headers = $state.raw<string[]>([])
	let rows = $state.raw<string[][]>([])
	let delimiter = $state<string>(',')
	let fileName = $state<string | null>(null)
	let loading = $state(false)

	let editedCells = $state(new Set<string>())
	let selectedRows = $state(new Set<number>())

	let showStats = $state(false)
	let validationIssues = $state<CsvIssue[]>([])
	let showValidation = $state(false)
	let convertedOutput = $state<string | null>(null)
	let convertedFormat = $state<string | null>(null)
	let editorMode = $state(false)

	let csvWorker: ReturnType<typeof createTypedWorker> | null = null

	const hasData = $derived(headers.length > 0)
	const hasSelectedRows = $derived(selectedRows.size > 0)

	function cleanupWorker(): void {
		if (csvWorker) {
			csvWorker.terminate()
			csvWorker = null
		}
	}

	async function handleFiles(files: File[]): Promise<void> {
		const file = files[0]
		if (!file) return

		loading = true
		fileName = file.name

		try {
			const text = await file.text()

			if (text.length > WORKER_THRESHOLD) {
				await parseInWorker(text)
			} else {
				parseOnMainThread(text)
			}
		} catch (err) {
			console.error('Failed to parse CSV:', err)
		} finally {
			loading = false
		}
	}

	function parseOnMainThread(text: string): void {
		const result = parseCsv(text)
		applyParseResult(result)
	}

	async function parseInWorker(text: string): Promise<void> {
		cleanupWorker()
		const worker = new Worker(
			new URL('$lib/workers/csv.worker.ts', import.meta.url),
			{ type: 'module' }
		)
		csvWorker = createTypedWorker(worker)
		const result = await csvWorker.request('parse', { text }) as ParseResult
		applyParseResult(result)
	}

	function applyParseResult(result: ParseResult): void {
		headers = result.headers
		rows = result.rows
		delimiter = result.delimiter
		editedCells = new Set<string>()
		selectedRows = new Set<number>()
		showValidation = false
		validationIssues = []
		convertedOutput = null
		convertedFormat = null
	}

	function handleCellEdit(row: number, col: number, value: string): void {
		const newRows = rows.map((r, i) => {
			if (i !== row) return r
			const newRow = [...r]
			newRow[col] = value
			return newRow
		})
		rows = newRows
		const newEdited = new Set(editedCells)
		newEdited.add(`${row}:${col}`)
		editedCells = newEdited
	}

	function handleToggleRow(row: number): void {
		const next = new Set(selectedRows)
		if (next.has(row)) {
			next.delete(row)
		} else {
			next.add(row)
		}
		selectedRows = next
	}

	function handleToggleAll(): void {
		if (selectedRows.size === rows.length) {
			selectedRows = new Set<number>()
		} else {
			selectedRows = new Set(rows.map((_, i) => i))
		}
	}

	function handleConvertTo(format: 'json' | 'markdown' | 'tsv'): void {
		if (format === 'json') {
			const json = csvToJson(headers, rows)
			convertedOutput = JSON.stringify(json, null, 2)
			convertedFormat = 'JSON'
		} else if (format === 'markdown') {
			convertedOutput = csvToMarkdown(headers, rows)
			convertedFormat = 'Markdown'
		} else if (format === 'tsv') {
			convertedOutput = csvToTsv(headers, rows)
			convertedFormat = 'TSV'
		}
	}

	function handleOpenFile(): void {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.csv,.tsv,.txt,.json'
		input.onchange = async () => {
			const file = input.files?.[0]
			if (!file) return
			try {
				const text = await file.text()
				const ext = file.name.split('.').pop()?.toLowerCase()

				if (ext === 'json') {
					const data = JSON.parse(text) as object[]
					if (!Array.isArray(data)) {
						console.error('JSON must be an array of objects')
						return
					}
					const result = jsonToCsv(data)
					applyParseResult({
						...result,
						delimiter: ',',
						rowCount: result.rows.length
					})
					fileName = file.name
				} else {
					if (text.length > WORKER_THRESHOLD) {
						loading = true
						await parseInWorker(text)
						loading = false
					} else {
						parseOnMainThread(text)
					}
					fileName = file.name
				}
			} catch (err) {
				console.error('Failed to open file:', err)
				loading = false
			}
		}
		input.click()
	}

	function handleDownloadCsv(): void {
		const csv = serializeCsv(headers, rows, delimiter as ',' | '\t' | ';' | '|')
		const suffix = editedCells.size > 0 ? '-edited' : ''
		const name = fileName
			? fileName.replace(/\.[^.]+$/, `${suffix}.csv`)
			: `data${suffix}.csv`
		downloadBlob(csv, name, 'text/csv')
	}

	function handleCopyClipboard(): void {
		const csv = serializeCsv(headers, rows, delimiter as ',' | '\t' | ';' | '|')
		navigator.clipboard.writeText(csv)
	}

	function handleAddRow(): void {
		const newRow = headers.map(() => '')
		rows = [...rows, newRow]
	}

	function handleDeleteRows(): void {
		rows = rows.filter((_, i) => !selectedRows.has(i))
		selectedRows = new Set<number>()
	}

	function handleAddColumn(name?: string): void {
		const colName = name ?? prompt('Column name:')
		if (colName === null || colName.trim() === '') return
		headers = [...headers, colName.trim()]
		rows = rows.map((row) => [...row, ''])
	}

	function handleDeleteColumn(colIdx?: number): void {
		if (headers.length === 0) return
		let idx = colIdx
		if (idx === undefined) {
			const name = prompt(`Delete column (enter name):\n${headers.join(', ')}`)
			if (name === null) return
			idx = headers.indexOf(name.trim())
			if (idx === -1) return
		}
		headers = headers.filter((_, i) => i !== idx)
		rows = rows.map((row) => row.filter((_, i) => i !== idx))
	}

	function handleMoveColumn(fromIdx: number, toIdx: number): void {
		const newHeaders = [...headers]
		const [movedHeader] = newHeaders.splice(fromIdx, 1)
		newHeaders.splice(toIdx, 0, movedHeader)
		headers = newHeaders

		rows = rows.map((row) => {
			const newRow = [...row]
			const [movedCell] = newRow.splice(fromIdx, 1)
			newRow.splice(toIdx, 0, movedCell)
			return newRow
		})
	}

	function handleToggleEditorMode(): void {
		editorMode = !editorMode
	}

	function handleValidate(): void {
		validationIssues = validateCsv(headers, rows)
		showValidation = true
	}

	function handleToggleStats(): void {
		showStats = !showStats
	}

	function downloadBlob(content: string, filename: string, mimeType: string): void {
		const blob = new Blob([content], { type: mimeType })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	function downloadConverted(): void {
		if (!convertedOutput || !convertedFormat) return
		const ext = convertedFormat === 'JSON' ? 'json' : convertedFormat === 'TSV' ? 'tsv' : 'md'
		const mime =
			convertedFormat === 'JSON'
				? 'application/json'
				: convertedFormat === 'TSV'
					? 'text/tab-separated-values'
					: 'text/markdown'
		const name = fileName
			? fileName.replace(/\.[^.]+$/, `.${ext}`)
			: `data.${ext}`
		downloadBlob(convertedOutput, name, mime)
	}

	function copyConverted(): void {
		if (convertedOutput) {
			navigator.clipboard.writeText(convertedOutput)
		}
	}

	function clearData(): void {
		headers = []
		rows = []
		fileName = null
		editedCells = new Set<string>()
		selectedRows = new Set<number>()
		showStats = false
		showValidation = false
		validationIssues = []
		convertedOutput = null
		convertedFormat = null
		editorMode = false
		cleanupWorker()
	}

	async function handleDownloadExcel(): Promise<void> {
		const { exportToExcel } = await import('$lib/utils/csv-excel')
		const buffer = await exportToExcel(headers, rows)
		const suffix = editedCells.size > 0 ? '-edited' : ''
		const name = fileName
			? fileName.replace(/\.[^.]+$/, `${suffix}.xlsx`)
			: `data${suffix}.xlsx`
		const blob = new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = name
		a.click()
		URL.revokeObjectURL(url)
	}

	$effect(() => {
		return () => cleanupWorker()
	})
</script>

<ToolHeader
	title="CSV Tools"
	description="Parse, convert, validate, and analyze CSV files in the browser."
/>

{#if loading}
	<div class="flex flex-col items-center justify-center gap-4 py-20">
		<LoadingSpinner size="lg" />
		<p class="text-muted-foreground text-sm">Parsing file...</p>
	</div>
{:else if !hasData}
	<FileDropzone accept=".csv,.tsv,.txt" onFiles={handleFiles} />
{:else}
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium">{fileName}</span>
				<span class="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
					{delimiter === ',' ? 'CSV' : delimiter === '\t' ? 'TSV' : delimiter === ';' ? 'Semicolon' : 'Pipe'}
				</span>
			</div>
			<Button variant="ghost" size="sm" onclick={clearData}>
				<X class="mr-1 size-4" />
				Clear
			</Button>
		</div>

		<CsvToolbar
			{hasData}
			onConvertTo={handleConvertTo}
			onOpenFile={handleOpenFile}
			onDownloadCsv={handleDownloadCsv}
			onDownloadExcel={handleDownloadExcel}
			onCopyClipboard={handleCopyClipboard}
			onAddRow={handleAddRow}
			onDeleteRows={handleDeleteRows}
			onAddColumn={handleAddColumn}
			onDeleteColumn={handleDeleteColumn}
			onValidate={handleValidate}
			onToggleStats={handleToggleStats}
			{hasSelectedRows}
			{showStats}
			{editorMode}
			onToggleEditorMode={handleToggleEditorMode}
		/>

		{#if convertedOutput}
			<Card.Root>
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="text-sm">{convertedFormat} Output</Card.Title>
						<div class="flex gap-1">
							<Button variant="ghost" size="sm" onclick={copyConverted}>
								<ClipboardCopy class="size-4" />
							</Button>
							<Button variant="ghost" size="sm" onclick={downloadConverted}>
								<Download class="size-4" />
							</Button>
							<Button variant="ghost" size="sm" onclick={() => { convertedOutput = null; convertedFormat = null }}>
								<X class="size-4" />
							</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<pre class="bg-muted max-h-64 overflow-auto rounded p-3 text-xs">{convertedOutput}</pre>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if showValidation}
			<Card.Root>
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="flex items-center gap-2 text-sm">
							{#if validationIssues.length === 0}
								<CheckCircle class="size-4 text-green-500" />
								No issues found
							{:else}
								<AlertTriangle class="size-4 text-amber-500" />
								{validationIssues.length} issue{validationIssues.length === 1 ? '' : 's'} found
							{/if}
						</Card.Title>
						<Button variant="ghost" size="sm" onclick={() => { showValidation = false }}>
							<X class="size-4" />
						</Button>
					</div>
				</Card.Header>
				{#if validationIssues.length > 0}
					<Card.Content>
						<div class="max-h-48 space-y-1 overflow-auto text-xs">
							{#each validationIssues.slice(0, 100) as issue, i (i)}
								<div class="text-muted-foreground flex items-start gap-2">
									<span class="mt-0.5 size-1.5 shrink-0 rounded-full {issue.type === 'inconsistent-columns' ? 'bg-red-500' : issue.type === 'empty-row' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
									<span>{issue.message}</span>
								</div>
							{/each}
							{#if validationIssues.length > 100}
								<div class="text-muted-foreground pt-1">
									...and {validationIssues.length - 100} more issues
								</div>
							{/if}
						</div>
					</Card.Content>
				{/if}
			</Card.Root>
		{/if}

		<CsvTable
			{headers}
			{rows}
			onCellEdit={handleCellEdit}
			{selectedRows}
			onToggleRow={handleToggleRow}
			onToggleAll={handleToggleAll}
			{editedCells}
			{editorMode}
			onDeleteColumn={handleDeleteColumn}
			onMoveColumn={handleMoveColumn}
			onAddColumn={handleAddColumn}
		/>

		{#if showStats}
			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium">Column Statistics</h3>
				<CsvStats {headers} {rows} />
			</div>
		{/if}
	</div>
{/if}
