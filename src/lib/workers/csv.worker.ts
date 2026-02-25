import type { WorkerMessage } from './worker-utils'
import { parseCsv, validateCsv } from '../utils/csv-parser'
import type { ParseOptions, ParseResult, CsvIssue } from '../utils/csv-parser'

type CsvWorkerRequest =
	| { type: 'parse'; payload: { text: string; options?: ParseOptions } }
	| { type: 'validate'; payload: { headers: string[]; rows: string[][] } }

type CsvWorkerPayload = ParseResult | CsvIssue[]

self.onmessage = (e: MessageEvent<WorkerMessage<CsvWorkerRequest['payload']>>) => {
	const { id, type, payload } = e.data

	try {
		if (type === 'parse') {
			const req = payload as { text: string; options?: ParseOptions }
			const result = parseCsv(req.text, req.options)
			const response: WorkerMessage<CsvWorkerPayload> = { id, type: 'parse', payload: result }
			self.postMessage(response)
		} else if (type === 'validate') {
			const req = payload as { headers: string[]; rows: string[][] }
			const issues = validateCsv(req.headers, req.rows)
			const response: WorkerMessage<CsvWorkerPayload> = { id, type: 'validate', payload: issues }
			self.postMessage(response)
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown worker error'
		const response: WorkerMessage<CsvWorkerPayload> = {
			id,
			type,
			payload: [] as CsvIssue[],
			error: message
		}
		self.postMessage(response)
	}
}
