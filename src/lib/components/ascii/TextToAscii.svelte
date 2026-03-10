<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ALL_FONTS, FONT_CATEGORIES, FONT_IMPORTS } from '$lib/utils/figlet-fonts';

	type Props = {
		output: string;
	};

	let { output = $bindable('') }: Props = $props();

	let text = $state('Hello');
	let font = $state('Standard');
	let loading = $state(false);
	let errorMessage = $state('');

	const loadedFonts = new Set<string>();

	async function loadFont(fontName: string): Promise<void> {
		if (loadedFonts.has(fontName)) return;

		const loader = FONT_IMPORTS[fontName];
		if (!loader) throw new Error(`Font "${fontName}" not available`);

		const figlet = await import('figlet');
		const fontModule = await loader();
		figlet.default.parseFont(fontName, fontModule.default ?? (fontModule as unknown as string));
		loadedFonts.add(fontName);
	}

	async function generateAscii(currentText: string, currentFont: string): Promise<void> {
		if (!currentText.trim()) {
			output = '';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			await loadFont(currentFont);
			const figlet = await import('figlet');
			const result = figlet.default.textSync(currentText, {
				font: currentFont as figlet.Fonts
			});
			output = result;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to generate ASCII art';
			output = '';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const currentText = text;
		const currentFont = font;
		const timeout = setTimeout(() => {
			generateAscii(currentText, currentFont);
		}, 300);
		return () => clearTimeout(timeout);
	});

	function handleFontChange(value: string | undefined): void {
		if (value) {
			font = value;
		}
	}
</script>

<div class="space-y-4">
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label>Text</Label>
			<Input bind:value={text} placeholder="Type something..." />
		</div>
		<div class="space-y-2">
			<Label>Font</Label>
			<Select.Root type="single" value={font} onValueChange={handleFontChange}>
				<Select.Trigger class="w-full">
					{ALL_FONTS.find((f) => f.value === font)?.label ?? 'Select font'}
				</Select.Trigger>
				<Select.Content class="max-h-72">
					{#each FONT_CATEGORIES as category (category.label)}
						<Select.Group>
							<Select.GroupHeading>{category.label}</Select.GroupHeading>
							{#each category.fonts as f (f.value)}
								<Select.Item value={f.value}>{f.label}</Select.Item>
							{/each}
						</Select.Group>
						<Select.Separator />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	{#if errorMessage}
		<p class="text-destructive text-sm">{errorMessage}</p>
	{/if}

	{#if loading}
		<p class="text-muted-foreground text-sm">Generating...</p>
	{/if}

	{#if output}
		<div class="bg-muted overflow-x-auto rounded-lg p-4">
			<pre class="text-foreground text-xs leading-tight sm:text-sm">{output}</pre>
		</div>
	{:else if !loading && !errorMessage}
		<div class="bg-muted rounded-lg p-4">
			<p class="text-muted-foreground text-sm">Type something to see the ASCII art preview</p>
		</div>
	{/if}
</div>
