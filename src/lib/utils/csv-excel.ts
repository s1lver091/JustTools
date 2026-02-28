import ExcelJS from 'exceljs'

const HEADER_FILL_COLOR = '2563EB'
const HEADER_FONT_COLOR = 'FFFFFF'
const ALT_ROW_FILL_COLOR = 'F0F4FF'
const MIN_COL_WIDTH = 10
const MAX_COL_WIDTH = 40

function detectCellType(value: string): { type: 'number' | 'date' | 'string'; parsed: unknown } {
	if (value.trim() === '') return { type: 'string', parsed: '' }

	const num = Number(value)
	if (!isNaN(num) && value.trim() !== '') {
		return { type: 'number', parsed: num }
	}

	const dateMs = Date.parse(value)
	if (!isNaN(dateMs) && value.length >= 8) {
		return { type: 'date', parsed: new Date(dateMs) }
	}

	return { type: 'string', parsed: value }
}

function estimateColumnWidth(header: string, rows: string[][], colIdx: number): number {
	let maxLen = header.length
	const sampleSize = Math.min(rows.length, 100)
	for (let i = 0; i < sampleSize; i++) {
		const cellLen = (rows[i][colIdx] ?? '').length
		if (cellLen > maxLen) maxLen = cellLen
	}
	return Math.max(MIN_COL_WIDTH, Math.min(maxLen + 2, MAX_COL_WIDTH))
}

export async function exportToExcel(
	headers: string[],
	rows: string[][]
): Promise<ArrayBuffer> {
	const workbook = new ExcelJS.Workbook()
	workbook.creator = 'JustTools'
	workbook.created = new Date()

	const sheet = workbook.addWorksheet('Data')

	const headerRow = sheet.addRow(headers)
	headerRow.eachCell((cell) => {
		cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, size: 11 }
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: HEADER_FILL_COLOR }
		}
		cell.alignment = { vertical: 'middle', horizontal: 'center' }
		cell.border = {
			bottom: { style: 'thin', color: { argb: 'B0B0B0' } }
		}
	})

	for (const row of rows) {
		const excelRow: unknown[] = []
		for (let colIdx = 0; colIdx < headers.length; colIdx++) {
			const raw = row[colIdx] ?? ''
			const { parsed } = detectCellType(raw)
			excelRow.push(parsed)
		}
		sheet.addRow(excelRow)
	}

	for (let colIdx = 0; colIdx < headers.length; colIdx++) {
		const col = sheet.getColumn(colIdx + 1)
		col.width = estimateColumnWidth(headers[colIdx], rows, colIdx)
	}

	for (let rowIdx = 2; rowIdx <= rows.length + 1; rowIdx++) {
		const excelRow = sheet.getRow(rowIdx)
		if (rowIdx % 2 === 0) {
			excelRow.eachCell({ includeEmpty: true }, (cell) => {
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: ALT_ROW_FILL_COLOR }
				}
			})
		}
		excelRow.eachCell((cell) => {
			if (cell.value instanceof Date) {
				cell.numFmt = 'yyyy-mm-dd'
			}
		})
	}

	sheet.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: headers.length }
	}

	sheet.views = [{ state: 'frozen', ySplit: 1 }]

	const buffer = await workbook.xlsx.writeBuffer()
	return buffer as ArrayBuffer
}
