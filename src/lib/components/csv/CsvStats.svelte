<script lang="ts">
	import * as Card from '$lib/components/ui/card'

	interface ColumnStat {
		name: string
		isNumeric: boolean
		totalCount: number
		emptyCount: number
		min?: number
		max?: number
		mean?: number
		median?: number
		uniqueCount?: number
		mostCommon?: string
	}

	interface Props {
		headers: string[]
		rows: string[][]
	}

	let { headers, rows }: Props = $props()

	const stats = $derived.by((): ColumnStat[] => {
		return headers.map((name, colIdx) => {
			const values = rows.map((row) => row[colIdx] ?? '')
			const nonEmpty = values.filter((v) => v.trim() !== '')
			const emptyCount = values.length - nonEmpty.length

			const numbers = nonEmpty
				.map((v) => Number(v))
				.filter((n) => !isNaN(n))

			const isNumeric = numbers.length > nonEmpty.length * 0.5 && numbers.length > 0

			if (isNumeric) {
				const sorted = numbers.slice().sort((a, b) => a - b)
				const sum = sorted.reduce((a, b) => a + b, 0)
				const median =
					sorted.length % 2 === 0
						? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
						: sorted[Math.floor(sorted.length / 2)]

				return {
					name,
					isNumeric: true,
					totalCount: values.length,
					emptyCount,
					min: sorted[0],
					max: sorted[sorted.length - 1],
					mean: sum / sorted.length,
					median
				}
			}

			const freq = new Map<string, number>()
			for (const v of nonEmpty) {
				freq.set(v, (freq.get(v) ?? 0) + 1)
			}

			let mostCommon = ''
			let maxFreq = 0
			for (const [val, count] of freq) {
				if (count > maxFreq) {
					maxFreq = count
					mostCommon = val
				}
			}

			return {
				name,
				isNumeric: false,
				totalCount: values.length,
				emptyCount,
				uniqueCount: freq.size,
				mostCommon: mostCommon.length > 30 ? mostCommon.slice(0, 30) + '...' : mostCommon
			}
		})
	})

	function formatNumber(n: number | undefined): string {
		if (n === undefined) return '-'
		if (Number.isInteger(n)) return n.toLocaleString()
		return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
	}
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
	{#each stats as stat (stat.name)}
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">{stat.name}</Card.Title>
				<Card.Description class="text-xs">
					{stat.isNumeric ? 'Numeric' : 'Text'} - {stat.totalCount} values
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-1 text-xs">
					{#if stat.isNumeric}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Min</span>
							<span class="font-mono">{formatNumber(stat.min)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Max</span>
							<span class="font-mono">{formatNumber(stat.max)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Mean</span>
							<span class="font-mono">{formatNumber(stat.mean)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Median</span>
							<span class="font-mono">{formatNumber(stat.median)}</span>
						</div>
					{:else}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Unique</span>
							<span class="font-mono">{stat.uniqueCount}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Most Common</span>
							<span class="max-w-[120px] truncate font-mono" title={stat.mostCommon}>{stat.mostCommon || '-'}</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Empty</span>
						<span class="font-mono">{stat.emptyCount}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
