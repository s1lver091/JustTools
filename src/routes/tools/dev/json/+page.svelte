<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { jsonToYaml } from '$lib/utils/json-yaml';
	import { downloadBlob } from '$lib/utils/download';
	import { Copy, Download, CircleCheck, CircleX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let jsonInput = $state('');
	let output = $state('');
	let outputFormat = $state<'json' | 'yaml'>('json');
	let pathQuery = $state('');

	type ParseResult = {
		valid: boolean;
		data: unknown;
		error: string | null;
		line: number | null;
		column: number | null;
	};

	const parseResult: ParseResult = $derived.by(() => {
		if (!jsonInput.trim()) {
			return { valid: false, data: null, error: null, line: null, column: null };
		}
		try {
			const data = JSON.parse(jsonInput);
			return { valid: true, data, error: null, line: null, column: null };
		} catch (e) {
			if (e instanceof SyntaxError) {
				const posMatch = e.message.match(/position\s+(\d+)/i);
				let line: number | null = null;
				let column: number | null = null;
				if (posMatch) {
					const pos = parseInt(posMatch[1], 10);
					const before = jsonInput.slice(0, pos);
					const lines = before.split('\n');
					line = lines.length;
					column = lines[lines.length - 1].length + 1;
				}
				return { valid: false, data: null, error: e.message, line, column };
			}
			return { valid: false, data: null, error: 'Invalid JSON', line: null, column: null };
		}
	});

	function queryJsonPath(obj: unknown, path: string): unknown {
		if (!path.trim()) return obj;
		const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);

		let current: unknown = obj;
		for (const seg of segments) {
			if (current === null || current === undefined) return undefined;
			if (typeof current === 'object') {
				current = (current as Record<string, unknown>)[seg];
			} else {
				return undefined;
			}
		}
		return current;
	}

	const queryResult = $derived.by(() => {
		if (!pathQuery.trim() || !parseResult.valid) return null;
		const value = queryJsonPath(parseResult.data, pathQuery);
		if (value === undefined) return { found: false, text: '' } as const;
		return { found: true, text: JSON.stringify(value, null, 2) } as const;
	});

	function handleFormat() {
		if (!parseResult.valid) return;
		output = JSON.stringify(parseResult.data, null, 2);
		outputFormat = 'json';
	}

	function handleMinify() {
		if (!parseResult.valid) return;
		output = JSON.stringify(parseResult.data);
		outputFormat = 'json';
	}

	function handleToYaml() {
		if (!parseResult.valid) return;
		output = jsonToYaml(parseResult.data);
		outputFormat = 'yaml';
	}

	async function copyOutput() {
		if (!output) return;
		await navigator.clipboard.writeText(output);
		toast('Copied!');
	}

	function downloadOutput() {
		if (!output) return;
		const ext = outputFormat === 'yaml' ? 'yaml' : 'json';
		const mime = outputFormat === 'yaml' ? 'text/yaml' : 'application/json';
		const blob = new Blob([output], { type: mime });
		downloadBlob(blob, `output.${ext}`);
	}
</script>

<ToolHeader title="JSON Tools" description="Format, minify, query, and convert JSON" />

<div class="space-y-4">
	<div class="grid gap-4 lg:grid-cols-2">
		<!-- Input panel -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<Label for="json-input">Input</Label>
				<div class="flex items-center gap-1.5">
					{#if jsonInput.trim()}
						{#if parseResult.valid}
							<Badge class="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
								<CircleCheck class="mr-1 size-3" />
								Valid JSON
							</Badge>
						{:else if parseResult.error}
							<Badge variant="destructive">
								<CircleX class="mr-1 size-3" />
								Invalid
							</Badge>
						{/if}
					{/if}
				</div>
			</div>
			<textarea
				id="json-input"
				bind:value={jsonInput}
				placeholder={'{"key": "value"}'}
				rows="16"
				class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-sm focus:ring-2 focus:outline-none"
			></textarea>
			{#if parseResult.error}
				<p class="text-sm text-red-600 dark:text-red-400">
					{parseResult.error}
					{#if parseResult.line !== null}
						(line {parseResult.line}{parseResult.column !== null ? `, column ${parseResult.column}` : ''})
					{/if}
				</p>
			{/if}
		</div>

		<!-- Output panel -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<Label>Output</Label>
				{#if output}
					<div class="flex gap-1">
						<Button variant="ghost" size="icon" class="size-8" onclick={copyOutput}>
							<Copy class="size-4" />
						</Button>
						<Button variant="ghost" size="icon" class="size-8" onclick={downloadOutput}>
							<Download class="size-4" />
						</Button>
					</div>
				{/if}
			</div>
			<pre class="border-input bg-muted/30 h-[calc(16*1.5rem+1.5rem)] w-full overflow-auto rounded-lg border p-3 font-mono text-sm">{output || 'Output will appear here...'}</pre>
		</div>
	</div>

	<!-- Action buttons -->
	<div class="flex flex-wrap items-center gap-2">
		<Button onclick={handleFormat} disabled={!parseResult.valid}>Format</Button>
		<Button variant="outline" onclick={handleMinify} disabled={!parseResult.valid}>Minify</Button>
		<Button variant="outline" onclick={handleToYaml} disabled={!parseResult.valid}>Convert to YAML</Button>

		<div class="ml-auto flex items-center gap-2">
			<Label for="json-path" class="text-muted-foreground text-sm">Path:</Label>
			<Input
				id="json-path"
				bind:value={pathQuery}
				placeholder="e.g. user.name or items[0].id"
				class="w-56 font-mono text-sm"
				disabled={!parseResult.valid}
			/>
		</div>
	</div>

	<!-- Path query result -->
	{#if queryResult}
		<div class="border-border rounded-lg border p-4">
			{#if queryResult.found}
				<Label class="mb-2 block">Query result for <code class="bg-muted rounded px-1 font-mono text-xs">{pathQuery}</code></Label>
				<pre class="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-sm">{queryResult.text}</pre>
			{:else}
				<p class="text-muted-foreground text-sm">Path not found: <code class="bg-muted rounded px-1 font-mono text-xs">{pathQuery}</code></p>
			{/if}
		</div>
	{/if}
</div>
