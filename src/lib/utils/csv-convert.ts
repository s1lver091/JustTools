import { serializeCsv } from './csv-parser'

export function csvToJson(headers: string[], rows: string[][]): object[] {
	return rows.map((row) => {
		const obj: Record<string, string> = {}
		for (let i = 0; i < headers.length; i++) {
			obj[headers[i]] = row[i] ?? ''
		}
		return obj
	})
}

export function jsonToCsv(data: object[]): { headers: string[]; rows: string[][] } {
	if (data.length === 0) return { headers: [], rows: [] }

	const headers = Object.keys(data[0])
	const rows = data.map((item) => {
		const record = item as Record<string, unknown>
		return headers.map((h) => String(record[h] ?? ''))
	})

	return { headers, rows }
}

export function csvToMarkdown(headers: string[], rows: string[][]): string {
	const escapePipe = (s: string): string => s.replace(/\|/g, '\\|')

	const headerLine = '| ' + headers.map(escapePipe).join(' | ') + ' |'
	const separatorLine = '| ' + headers.map(() => '---').join(' | ') + ' |'
	const dataLines = rows.map((row) => {
		const cells = headers.map((_, i) => escapePipe(row[i] ?? ''))
		return '| ' + cells.join(' | ') + ' |'
	})

	return [headerLine, separatorLine, ...dataLines].join('\n')
}

export function csvToTsv(headers: string[], rows: string[][]): string {
	return serializeCsv(headers, rows, '\t')
}

export function tsvToCsv(headers: string[], rows: string[][]): string {
	return serializeCsv(headers, rows, ',')
}
