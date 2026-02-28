<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';

	let pattern = $state('');
	let testString = $state('');

	let flagG = $state(true);
	let flagI = $state(false);
	let flagM = $state(false);
	let flagS = $state(false);
	let flagU = $state(false);

	const flags = $derived(
		(flagG ? 'g' : '') +
		(flagI ? 'i' : '') +
		(flagM ? 'm' : '') +
		(flagS ? 's' : '') +
		(flagU ? 'u' : '')
	);

	type MatchResult = {
		segments: { text: string; isMatch: boolean; colorIndex: number }[];
		matches: {
			index: number;
			fullMatch: string;
			groups: (string | undefined)[];
		}[];
		error: string | null;
	};

	const result: MatchResult = $derived.by(() => {
		if (!pattern) {
			return { segments: [{ text: testString, isMatch: false, colorIndex: 0 }], matches: [], error: null };
		}

		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Invalid regex';
			return { segments: [{ text: testString, isMatch: false, colorIndex: 0 }], matches: [], error: msg };
		}

		if (!testString) {
			return { segments: [], matches: [], error: null };
		}

		const matches: MatchResult['matches'] = [];
		const segments: MatchResult['segments'] = [];
		let lastIndex = 0;
		let colorIndex = 0;

		if (flagG) {
			const allMatches = [...testString.matchAll(regex)];
			for (const m of allMatches) {
				const matchStart = m.index ?? 0;
				if (matchStart > lastIndex) {
					segments.push({ text: testString.slice(lastIndex, matchStart), isMatch: false, colorIndex: 0 });
				}
				segments.push({ text: m[0], isMatch: true, colorIndex });
				matches.push({
					index: matchStart,
					fullMatch: m[0],
					groups: m.slice(1)
				});
				lastIndex = matchStart + m[0].length;
				colorIndex = (colorIndex + 1) % 2;
			}
		} else {
			const m = regex.exec(testString);
			if (m) {
				const matchStart = m.index ?? 0;
				if (matchStart > 0) {
					segments.push({ text: testString.slice(0, matchStart), isMatch: false, colorIndex: 0 });
				}
				segments.push({ text: m[0], isMatch: true, colorIndex: 0 });
				matches.push({
					index: matchStart,
					fullMatch: m[0],
					groups: m.slice(1)
				});
				lastIndex = matchStart + m[0].length;
			}
		}

		if (lastIndex < testString.length) {
			segments.push({ text: testString.slice(lastIndex), isMatch: false, colorIndex: 0 });
		}

		return { segments, matches, error: null };
	});

	const maxGroups = $derived(
		result.matches.reduce((max, m) => Math.max(max, m.groups.length), 0)
	);
</script>

<ToolHeader title="Regex Tester" description="Test regular expressions with live match highlighting" />

<div class="space-y-4">
	<!-- Pattern input -->
	<div class="space-y-2">
		<Label for="regex-pattern">Pattern</Label>
		<div class="flex items-center gap-1">
			<span class="text-muted-foreground font-mono text-lg">/</span>
			<Input
				id="regex-pattern"
				bind:value={pattern}
				placeholder="Enter regex pattern..."
				class="font-mono"
			/>
			<span class="text-muted-foreground font-mono text-lg">/{flags}</span>
		</div>
		{#if result.error}
			<p class="text-sm text-red-600 dark:text-red-400">{result.error}</p>
		{/if}
	</div>

	<!-- Flags -->
	<div class="flex flex-wrap items-center gap-4">
		<span class="text-muted-foreground text-sm font-medium">Flags:</span>
		{#each [
			{ label: 'g', desc: 'global', get: () => flagG, set: (v: boolean) => (flagG = v) },
			{ label: 'i', desc: 'case-insensitive', get: () => flagI, set: (v: boolean) => (flagI = v) },
			{ label: 'm', desc: 'multiline', get: () => flagM, set: (v: boolean) => (flagM = v) },
			{ label: 's', desc: 'dotAll', get: () => flagS, set: (v: boolean) => (flagS = v) },
			{ label: 'u', desc: 'unicode', get: () => flagU, set: (v: boolean) => (flagU = v) }
		] as flag (flag.label)}
			<label class="flex items-center gap-1.5 text-sm">
				<Switch checked={flag.get()} onCheckedChange={flag.set} />
				<span class="font-mono font-bold">{flag.label}</span>
				<span class="text-muted-foreground hidden sm:inline">({flag.desc})</span>
			</label>
		{/each}
	</div>

	<!-- Test string -->
	<div class="space-y-2">
		<Label for="test-string">Test string</Label>
		<textarea
			id="test-string"
			bind:value={testString}
			placeholder="Enter test string..."
			rows="6"
			class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-sm focus:ring-2 focus:outline-none"
		></textarea>
	</div>

	<!-- Highlighted output -->
	{#if testString && pattern && !result.error}
		<div class="space-y-2">
			<Label>Matches</Label>
			<div class="border-border rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap break-all">
			{#each result.segments as seg (seg)}
					{#if seg.isMatch}
						<mark class="rounded px-0.5 {seg.colorIndex === 0 ? 'bg-yellow-300/60 dark:bg-yellow-500/30' : 'bg-orange-300/60 dark:bg-orange-500/30'}">{seg.text}</mark>
					{:else}
						{seg.text}
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- Match groups table -->
	{#if result.matches.length > 0}
		<div class="space-y-2">
			<Label>Match groups ({result.matches.length} match{result.matches.length !== 1 ? 'es' : ''})</Label>
			<div class="border-border overflow-x-auto rounded-lg border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border bg-muted/50 border-b">
							<th class="px-3 py-2 text-left font-medium">#</th>
							<th class="px-3 py-2 text-left font-medium">Match</th>
							<th class="px-3 py-2 text-left font-medium">Index</th>
						{#each Array(maxGroups) as _, i (i)}
								<th class="px-3 py-2 text-left font-medium">Group {i + 1}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
					{#each result.matches as match, i (i)}
							<tr class="border-border border-b last:border-0">
								<td class="text-muted-foreground px-3 py-2">{i + 1}</td>
								<td class="px-3 py-2 font-mono">{match.fullMatch}</td>
								<td class="text-muted-foreground px-3 py-2">{match.index}</td>
							{#each Array(maxGroups) as _, gi (gi)}
									<td class="px-3 py-2 font-mono">
										{match.groups[gi] ?? ''}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else if testString && pattern && !result.error}
		<p class="text-muted-foreground py-4 text-center text-sm">No matches found</p>
	{/if}
</div>
