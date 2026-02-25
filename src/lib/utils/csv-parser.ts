export type Delimiter = ',' | '\t' | ';' | '|'

export type ParseResult = {
	headers: string[]
	rows: string[][]
	delimiter: Delimiter
	rowCount: number
}

export type ParseOptions = {
	delimiter?: Delimiter
	hasHeaders?: boolean
	maxRows?: number
}

export type CsvIssue = {
	type: 'inconsistent-columns' | 'empty-row' | 'empty-cell'
	row: number
	column?: number
	message: string
}

const DELIMITERS: Delimiter[] = [',', '\t', ';', '|']

export function detectDelimiter(sample: string): Delimiter {
	const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5)
	if (lines.length === 0) return ','

	let bestDelimiter: Delimiter = ','
	let bestScore = -1

	for (const d of DELIMITERS) {
		const counts = lines.map((line) => countDelimiterInLine(line, d))
		const min = Math.min(...counts)
		const max = Math.max(...counts)

		if (min === 0) continue

		// Score: high count with low variance wins
		const consistency = min === max ? min * 2 : min
		if (consistency > bestScore) {
			bestScore = consistency
			bestDelimiter = d
		}
	}

	return bestDelimiter
}

function countDelimiterInLine(line: string, delimiter: Delimiter): number {
	let count = 0
	let inQuotes = false

	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (ch === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				i++ // skip escaped quote
			} else {
				inQuotes = !inQuotes
			}
		} else if (ch === delimiter && !inQuotes) {
			count++
		}
	}

	return count
}

export function parseCsv(text: string, options?: ParseOptions): ParseResult {
	const hasHeaders = options?.hasHeaders ?? true
	const delimiter = options?.delimiter ?? detectDelimiter(text)
	const maxRows = options?.maxRows

	const allRows = parseRows(text, delimiter)

	// Trim trailing empty rows
	while (allRows.length > 0 && allRows[allRows.length - 1].every((c) => c === '')) {
		allRows.pop()
	}

	let headers: string[]
	let rows: string[][]

	if (hasHeaders && allRows.length > 0) {
		headers = allRows[0]
		rows = allRows.slice(1)
	} else {
		headers = allRows.length > 0 ? allRows[0].map((_, i) => `Column ${i + 1}`) : []
		rows = allRows
	}

	if (maxRows !== undefined) {
		rows = rows.slice(0, maxRows)
	}

	return { headers, rows, delimiter, rowCount: rows.length }
}

function parseRows(text: string, delimiter: Delimiter): string[][] {
	const rows: string[][] = []
	let currentRow: string[] = []
	let currentField = ''
	let inQuotes = false
	let i = 0

	while (i < text.length) {
		const ch = text[i]

		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < text.length && text[i + 1] === '"') {
					currentField += '"'
					i += 2
				} else {
					inQuotes = false
					i++
				}
			} else {
				currentField += ch
				i++
			}
		} else {
			if (ch === '"') {
				inQuotes = true
				i++
			} else if (ch === delimiter) {
				currentRow.push(currentField)
				currentField = ''
				i++
			} else if (ch === '\r') {
				currentRow.push(currentField)
				currentField = ''
				rows.push(currentRow)
				currentRow = []
				if (i + 1 < text.length && text[i + 1] === '\n') {
					i += 2
				} else {
					i++
				}
			} else if (ch === '\n') {
				currentRow.push(currentField)
				currentField = ''
				rows.push(currentRow)
				currentRow = []
				i++
			} else {
				currentField += ch
				i++
			}
		}
	}

	// Push last field and row
	if (currentField !== '' || currentRow.length > 0) {
		currentRow.push(currentField)
		rows.push(currentRow)
	}

	return rows
}

export function serializeCsv(
	headers: string[],
	rows: string[][],
	delimiter: Delimiter = ','
): string {
	const lines: string[] = []
	lines.push(headers.map((h) => quoteField(h, delimiter)).join(delimiter))
	for (const row of rows) {
		lines.push(row.map((cell) => quoteField(cell, delimiter)).join(delimiter))
	}
	return lines.join('\n')
}

function quoteField(value: string, delimiter: Delimiter): string {
	if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return '"' + value.replace(/"/g, '""') + '"'
	}
	return value
}

export function validateCsv(headers: string[], rows: string[][]): CsvIssue[] {
	const issues: CsvIssue[] = []
	const expectedCols = headers.length

	for (let r = 0; r < rows.length; r++) {
		const row = rows[r]

		// Empty row check
		if (row.every((cell) => cell.trim() === '')) {
			issues.push({
				type: 'empty-row',
				row: r,
				message: `Row ${r + 1} is empty`
			})
			continue
		}

		// Inconsistent column count
		if (row.length !== expectedCols) {
			issues.push({
				type: 'inconsistent-columns',
				row: r,
				message: `Row ${r + 1} has ${row.length} columns (expected ${expectedCols})`
			})
		}

		// Empty cells in columns that are mostly filled
		for (let c = 0; c < row.length; c++) {
			if (row[c].trim() === '') {
				issues.push({
					type: 'empty-cell',
					row: r,
					column: c,
					message: `Row ${r + 1}, column "${headers[c] ?? c + 1}" is empty`
				})
			}
		}
	}

	return issues
}
