<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type zxcvbnType from 'zxcvbn';

	const SCORE_LABELS = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'] as const;
	const SCORE_COLORS = [
		'bg-red-500',
		'bg-orange-500',
		'bg-yellow-500',
		'bg-lime-500',
		'bg-green-500'
	] as const;

	let zxcvbnFn: typeof zxcvbnType | null = $state(null);
	let password = $state('');
	let debouncedPassword = $state('');

	async function loadZxcvbn(): Promise<void> {
		if (zxcvbnFn) return;
		const mod = await import('zxcvbn');
		zxcvbnFn = mod.default;
	}

	$effect(() => {
		const pw = password;
		const timeout = setTimeout(() => {
			debouncedPassword = pw;
		}, 300);
		return () => clearTimeout(timeout);
	});

	const result = $derived.by(() => {
		if (!debouncedPassword || !zxcvbnFn) return null;
		return zxcvbnFn(debouncedPassword);
	});
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<Label for="strength-input">Password to check</Label>
		<Input
			id="strength-input"
			type="text"
			placeholder="Type or paste a password..."
			bind:value={password}
			onfocus={loadZxcvbn}
			autocomplete="off"
		/>
	</div>

	{#if result}
		{@const score = result.score}
		<div class="space-y-4">
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">{SCORE_LABELS[score]}</span>
					<span class="text-muted-foreground text-sm">{score}/4</span>
				</div>
				<div class="bg-muted flex h-2.5 gap-1 rounded-full">
					{#each { length: 5 } as _, i (i)}
						<div
							class="h-full flex-1 rounded-full transition-colors {i <= score
								? SCORE_COLORS[score]
								: 'bg-muted'}"
						></div>
					{/each}
				</div>
			</div>

			<div class="bg-muted/50 rounded-lg border p-4">
				<p class="text-muted-foreground text-xs uppercase tracking-wide">
					Time to crack (offline)
				</p>
				<p class="mt-1 font-mono text-lg">
					{result.crack_times_display.offline_slow_hashing_1e4_per_second}
				</p>
			</div>

			{#if result.feedback.warning}
				<div class="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
					<p class="text-sm text-orange-600 dark:text-orange-400">
						{result.feedback.warning}
					</p>
				</div>
			{/if}

			{#if score < 4 && result.feedback.suggestions.length > 0}
				<div class="space-y-2">
					<p class="text-sm font-medium">Suggestions</p>
					<ul class="text-muted-foreground list-inside list-disc space-y-1 text-sm">
						{#each result.feedback.suggestions as suggestion (suggestion)}
							<li>{suggestion}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</div>
