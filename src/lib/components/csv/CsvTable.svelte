<script lang="ts">
	import { ArrowUp, ArrowDown, X, Plus, GripVertical } from '@lucide/svelte'

	interface Props {
		headers: string[]
		rows: string[][]
		onCellEdit?: (row: number, col: number, value: string) => void
		selectedRows?: Set<number>
		onToggleRow?: (row: number) => void
		onToggleAll?: () => void
		editedCells?: Set<string>
		editorMode?: boolean
		onDeleteColumn?: (colIdx: number) => void
		onMoveColumn?: (fromIdx: number, toIdx: number) => void
		onAddColumn?: (name: string) => void
	}

	let {
		headers,
		rows,
		onCellEdit,
		selectedRows = new Set<number>(),
		onToggleRow,
		onToggleAll,
		editedCells = new Set<string>(),
		editorMode = false,
		onDeleteColumn,
		onMoveColumn,
		onAddColumn
	}: Props = $props()

	const ROW_HEIGHT = 36
	const BUFFER_ROWS = 10

	type SortDir = 'asc' | 'desc' | null
	let sortColumn = $state<number | null>(null)
	let sortDir = $state<SortDir>(null)

	let filters = $state<string[]>([])

	$effect(() => {
		if (headers.length > 0 && filters.length !== headers.length) {
			filters = headers.map(() => '')
		}
	})

	function handleSort(colIndex: number): void {
		if (sortColumn === colIndex) {
			if (sortDir === 'asc') sortDir = 'desc'
			else if (sortDir === 'desc') {
				sortDir = null
				sortColumn = null
			}
		} else {
			sortColumn = colIndex
			sortDir = 'asc'
		}
	}

	function compareValues(a: string, b: string): number {
		const numA = Number(a)
		const numB = Number(b)
		if (!isNaN(numA) && !isNaN(numB) && a.trim() !== '' && b.trim() !== '') {
			return numA - numB
		}
		return a.localeCompare(b, undefined, { sensitivity: 'base' })
	}

	const filteredIndexed = $derived.by(() => {
		if (filters.every((f) => f === '')) {
			return rows.map((row, originalIndex) => ({ row, originalIndex }))
		}

		const result: { row: string[]; originalIndex: number }[] = []
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i]
			const passes = filters.every((filter, colIdx) => {
				if (filter === '') return true
				const cellValue = (row[colIdx] ?? '').toLowerCase()
				return cellValue.includes(filter.toLowerCase())
			})
			if (passes) result.push({ row, originalIndex: i })
		}
		return result
	})

	const processedRows = $derived.by(() => {
		if (sortColumn === null || sortDir === null) return filteredIndexed

		const col = sortColumn
		const dir = sortDir
		return filteredIndexed.slice().sort((a, b) => {
			const cmp = compareValues(a.row[col] ?? '', b.row[col] ?? '')
			return dir === 'asc' ? cmp : -cmp
		})
	})

	let containerRef = $state<HTMLDivElement | null>(null)
	let scrollTop = $state(0)
	let containerHeight = $state(400)

	function handleScroll(): void {
		if (containerRef) {
			scrollTop = containerRef.scrollTop
		}
	}

	$effect(() => {
		if (containerRef) {
			containerHeight = containerRef.clientHeight
			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					containerHeight = entry.contentRect.height
				}
			})
			observer.observe(containerRef)
			return () => observer.disconnect()
		}
	})

	const totalHeight = $derived(processedRows.length * ROW_HEIGHT)
	const startIndex = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS))
	const endIndex = $derived(
		Math.min(
			processedRows.length,
			Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS
		)
	)
	const visibleIndexed = $derived(processedRows.slice(startIndex, endIndex))
	const offsetY = $derived(startIndex * ROW_HEIGHT)

	let editingCell = $state<{ row: number; col: number } | null>(null)
	let editValue = $state('')

	function focusOnMount(node: HTMLInputElement): void {
		node.focus()
	}

	function startEdit(rowIdx: number, colIdx: number): void {
		if (!onCellEdit) return
		const entry = processedRows[rowIdx]
		if (!entry) return
		editingCell = { row: entry.originalIndex, col: colIdx }
		editValue = entry.row[colIdx] ?? ''
	}

	function confirmEdit(): void {
		if (editingCell && onCellEdit) {
			onCellEdit(editingCell.row, editingCell.col, editValue)
		}
		editingCell = null
	}

	function cancelEdit(): void {
		editingCell = null
	}

	function handleEditKeyDown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault()
			confirmEdit()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			cancelEdit()
		}
	}

	const showFilters = $derived(headers.length > 0)
	const allSelected = $derived(
		processedRows.length > 0 && processedRows.every((entry) => selectedRows.has(entry.originalIndex))
	)

	let dragColumn = $state<number | null>(null)
	let dragOverColumn = $state<number | null>(null)
	let addingColumn = $state(false)
	let newColumnName = $state('')

	function handleDragStart(e: DragEvent, colIdx: number): void {
		if (!editorMode) return
		dragColumn = colIdx
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('text/plain', String(colIdx))
		}
	}

	function handleDragOver(e: DragEvent, colIdx: number): void {
		if (!editorMode || dragColumn === null) return
		e.preventDefault()
		dragOverColumn = colIdx
	}

	function handleDragLeave(): void {
		dragOverColumn = null
	}

	function handleDrop(e: DragEvent, colIdx: number): void {
		e.preventDefault()
		if (dragColumn !== null && dragColumn !== colIdx && onMoveColumn) {
			onMoveColumn(dragColumn, colIdx)
		}
		dragColumn = null
		dragOverColumn = null
	}

	function handleDragEnd(): void {
		dragColumn = null
		dragOverColumn = null
	}

	function handleAddColumnSubmit(): void {
		if (newColumnName.trim() && onAddColumn) {
			onAddColumn(newColumnName.trim())
		}
		newColumnName = ''
		addingColumn = false
	}

	function handleAddColumnKeyDown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleAddColumnSubmit()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			addingColumn = false
			newColumnName = ''
		}
	}
</script>

<div class="flex flex-col overflow-hidden rounded-lg border">
	<div class="bg-muted/50 text-muted-foreground flex items-center gap-4 border-b px-3 py-1.5 text-xs">
		<span>{headers.length} columns</span>
		<span class="bg-border h-3 w-px"></span>
		{#if filteredIndexed.length !== rows.length}
			<span>Showing {filteredIndexed.length.toLocaleString()} of {rows.length.toLocaleString()} rows</span>
		{:else}
			<span>{rows.length.toLocaleString()} rows</span>
		{/if}
	</div>

	<div
		bind:this={containerRef}
		class="relative flex-1 overflow-auto"
		style="max-height: 70vh;"
		onscroll={handleScroll}
	>
		<table class="w-full border-collapse text-sm" style="table-layout: auto;">
			<thead class="bg-muted/80 sticky top-0 z-10">
				<tr>
					{#if onToggleRow}
						<th class="border-border w-10 border-b px-2 py-2 text-center">
							<input
								type="checkbox"
								checked={allSelected}
								onchange={() => onToggleAll?.()}
								class="accent-primary"
							/>
						</th>
					{/if}
					<th class="border-border text-muted-foreground w-12 border-b px-2 py-2 text-right text-xs font-medium">
						#
					</th>
					{#each headers as header, colIdx (colIdx)}
						<th
							class="border-border select-none border-b px-3 py-2 text-left text-xs font-medium transition-colors {editorMode ? 'cursor-grab' : 'hover:bg-muted cursor-pointer'} {dragOverColumn === colIdx ? 'bg-primary/10' : ''}"
							onclick={() => { if (!editorMode) handleSort(colIdx) }}
							draggable={editorMode}
							ondragstart={(e) => handleDragStart(e, colIdx)}
							ondragover={(e) => handleDragOver(e, colIdx)}
							ondragleave={handleDragLeave}
							ondrop={(e) => handleDrop(e, colIdx)}
							ondragend={handleDragEnd}
						>
							<span class="flex items-center gap-1">
								{#if editorMode}
									<GripVertical class="text-muted-foreground size-3 shrink-0" />
								{/if}
								<span class="truncate">{header}</span>
								{#if !editorMode}
									{#if sortColumn === colIdx && sortDir === 'asc'}
										<ArrowUp class="size-3" />
									{:else if sortColumn === colIdx && sortDir === 'desc'}
										<ArrowDown class="size-3" />
									{/if}
								{/if}
								{#if editorMode}
									<button
										class="text-muted-foreground hover:text-destructive ml-auto shrink-0 rounded p-0.5 transition-colors"
										onclick={(e) => { e.stopPropagation(); onDeleteColumn?.(colIdx) }}
										title="Delete column"
									>
										<X class="size-3" />
									</button>
								{/if}
							</span>
						</th>
					{/each}
					{#if editorMode}
						<th class="border-border border-b px-2 py-2 text-center">
							{#if addingColumn}
								<input
									type="text"
									class="bg-background border-primary w-24 rounded border px-2 py-0.5 text-xs"
									placeholder="Name..."
									bind:value={newColumnName}
									onblur={handleAddColumnSubmit}
									onkeydown={handleAddColumnKeyDown}
									use:focusOnMount
								/>
							{:else}
								<button
									class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
									onclick={() => { addingColumn = true }}
									title="Add column"
								>
									<Plus class="size-4" />
								</button>
							{/if}
						</th>
					{/if}
				</tr>
				{#if showFilters}
					<tr>
						{#if onToggleRow}
							<th class="border-border border-b px-2 py-1"></th>
						{/if}
						<th class="border-border border-b px-2 py-1"></th>
						{#each headers as _, colIdx (colIdx)}
							<th class="border-border border-b px-1 py-1">
								<input
									type="text"
									placeholder="Filter..."
									class="bg-background border-border w-full rounded border px-2 py-0.5 text-xs"
									bind:value={filters[colIdx]}
								/>
							</th>
						{/each}
						{#if editorMode}
							<th class="border-border border-b px-2 py-1"></th>
						{/if}
					</tr>
				{/if}
			</thead>

			<tbody>
				{#if startIndex > 0}
					<tr style="height: {offsetY}px;">
						<td></td>
					</tr>
				{/if}
				{#each visibleIndexed as entry, vIdx (entry.originalIndex)}
					{@const rowIdx = startIndex + vIdx}
					{@const originalIdx = entry.originalIndex}
					{@const row = entry.row}
					<tr
						class="hover:bg-muted/50 transition-colors {rowIdx % 2 === 0 ? '' : 'bg-muted/20'} {selectedRows.has(originalIdx) ? 'bg-primary/5' : ''}"
						style="height: {ROW_HEIGHT}px;"
					>
						{#if onToggleRow}
							<td class="border-border border-b px-2 text-center">
								<input
									type="checkbox"
									checked={selectedRows.has(originalIdx)}
									onchange={() => onToggleRow?.(originalIdx)}
									class="accent-primary"
								/>
							</td>
						{/if}
						<td class="border-border text-muted-foreground border-b px-2 text-right text-xs">
							{originalIdx + 1}
						</td>
						{#each row as cell, colIdx (colIdx)}
							{@const isEditing = editingCell?.row === originalIdx && editingCell?.col === colIdx}
							{@const isEdited = editedCells.has(`${originalIdx}:${colIdx}`)}
							<td
								class="border-border max-w-xs truncate border-b px-3 py-1 {isEdited ? 'bg-amber-500/10' : ''}"
								ondblclick={() => startEdit(rowIdx, colIdx)}
							>
								{#if isEditing}
									<input
										type="text"
										class="bg-background border-primary w-full rounded border px-1 py-0.5 text-sm outline-none"
										bind:value={editValue}
										onblur={confirmEdit}
										onkeydown={handleEditKeyDown}
										use:focusOnMount
									/>
								{:else}
									{cell}
								{/if}
							</td>
						{/each}
						{#if editorMode}
							<td class="border-border border-b"></td>
						{/if}
					</tr>
				{/each}
				{#if endIndex < processedRows.length}
					<tr style="height: {totalHeight - endIndex * ROW_HEIGHT}px;">
						<td></td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
