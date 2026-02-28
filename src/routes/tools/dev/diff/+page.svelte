<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Label } from '$lib/components/ui/label';
	import { computeDiff } from '$lib/utils/diff';
	import type { DiffLine } from '$lib/utils/diff';

	let oldText = $state('');
	let newText = $state('');
	let viewMode = $state<'inline' | 'side-by-side'>('inline');

	const result = $derived(computeDiff(oldText, newText));
	const hasInput = $derived(oldText.length > 0 || newText.length > 0);

	function sideBySideLines(lines: DiffLine[]): { left: DiffLine[]; right: DiffLine[] } {
		const left: DiffLine[] = [];
		const right: DiffLine[] = [];

		for (const line of lines) {
			if (line.type === 'unchanged') {
				left.push(line);
				right.push(line);
			} else if (line.type === 'removed') {
				left.push(line);
				right.push({ type: 'unchanged', text: '' });
			} else {
				left.push({ type: 'unchanged', text: '' });
				right.push(line);
			}
		}

		return { left, right };
	}

	const sideBySide = $derived(sideBySideLines(result.lines));
</script>

<ToolHeader title="Text Diff" description="Compare two texts side by side with color-coded differences" />

<div class="space-y-4">
	<!-- Input textareas -->
	<div class="grid gap-4 md:grid-cols-2">
		<div class="space-y-2">
			<Label for="old-text">Original</Label>
			<textarea
				id="old-text"
				bind:value={oldText}
				placeholder="Paste original text here..."
				rows="10"
				class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-sm focus:ring-2 focus:outline-none"
			></textarea>
		</div>
		<div class="space-y-2">
			<Label for="new-text">Modified</Label>
			<textarea
				id="new-text"
				bind:value={newText}
				placeholder="Paste modified text here..."
				rows="10"
				class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-sm focus:ring-2 focus:outline-none"
			></textarea>
		</div>
	</div>

	{#if hasInput}
		<!-- Stats bar -->
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant="outline" class="border-green-500/30 text-green-600 dark:text-green-400">
				+{result.stats.added} added
			</Badge>
			<Badge variant="outline" class="border-red-500/30 text-red-600 dark:text-red-400">
				-{result.stats.removed} removed
			</Badge>
			<Badge variant="outline">
				{result.stats.unchanged} unchanged
			</Badge>
			<div class="ml-auto">
				<Tabs.Root bind:value={viewMode}>
					<Tabs.List>
						<Tabs.Trigger value="inline">Inline</Tabs.Trigger>
						<Tabs.Trigger value="side-by-side">Side by side</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</div>
		</div>

		<!-- Diff output -->
		<div class="border-border overflow-x-auto rounded-lg border">
			{#if viewMode === 'inline'}
				<div class="divide-border divide-y font-mono text-sm">
					{#each result.lines as line}
						<div
							class="flex {line.type === 'added'
								? 'bg-green-500/10 text-green-700 dark:text-green-400'
								: line.type === 'removed'
									? 'bg-red-500/10 text-red-700 dark:text-red-400'
									: 'text-muted-foreground'}"
						>
							<span class="text-muted-foreground w-12 shrink-0 select-none border-r px-2 py-0.5 text-right text-xs leading-6">
								{line.lineNumberOld ?? ''}
							</span>
							<span class="text-muted-foreground w-12 shrink-0 select-none border-r px-2 py-0.5 text-right text-xs leading-6">
								{line.lineNumberNew ?? ''}
							</span>
							<span class="w-6 shrink-0 select-none text-center leading-6">
								{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
							</span>
							<span class="whitespace-pre-wrap break-all py-0.5 leading-6">{line.text}</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="grid grid-cols-2">
					<!-- Left: original -->
					<div class="divide-border border-border divide-y border-r font-mono text-sm">
					{#each sideBySide.left as line, i (i)}
							<div
								class="flex {line.type === 'removed'
									? 'bg-red-500/10 text-red-700 dark:text-red-400'
									: 'text-muted-foreground'}"
							>
								<span class="text-muted-foreground w-12 shrink-0 select-none border-r px-2 py-0.5 text-right text-xs leading-6">
									{line.lineNumberOld ?? ''}
								</span>
								<span class="whitespace-pre-wrap break-all py-0.5 pl-2 leading-6">{line.text}</span>
							</div>
						{/each}
					</div>
					<!-- Right: modified -->
					<div class="divide-border divide-y font-mono text-sm">
					{#each sideBySide.right as line, i (i)}
							<div
								class="flex {line.type === 'added'
									? 'bg-green-500/10 text-green-700 dark:text-green-400'
									: 'text-muted-foreground'}"
							>
								<span class="text-muted-foreground w-12 shrink-0 select-none border-r px-2 py-0.5 text-right text-xs leading-6">
									{line.lineNumberNew ?? ''}
								</span>
								<span class="whitespace-pre-wrap break-all py-0.5 pl-2 leading-6">{line.text}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-muted-foreground py-8 text-center text-sm">
			Enter text in both fields to see the diff
		</p>
	{/if}
</div>
