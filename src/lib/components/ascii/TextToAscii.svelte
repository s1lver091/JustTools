<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	type FontName = 'Standard' | 'Banner' | 'Big' | 'Slant' | 'Small';

	interface Props {
		output: string;
	}

	let { output = $bindable('') }: Props = $props();

	const FONTS: { value: FontName; label: string }[] = [
		{ value: 'Standard', label: 'Standard' },
		{ value: 'Banner', label: 'Banner' },
		{ value: 'Big', label: 'Big' },
		{ value: 'Slant', label: 'Slant' },
		{ value: 'Small', label: 'Small' }
	];

	let text = $state('Hello');
	let font = $state<FontName>('Standard');
	let loading = $state(false);
	let errorMessage = $state('');

	const loadedFonts = new Set<string>();

	async function loadFont(fontName: FontName): Promise<void> {
		if (loadedFonts.has(fontName)) return;

		const figlet = await import('figlet');
		const fontData = await getFontData(fontName);
		figlet.default.parseFont(fontName, fontData);
		loadedFonts.add(fontName);
	}

	async function getFontData(fontName: FontName): Promise<string> {
		/* Font modules lack type declarations - suppress with ts-expect-error */
		switch (fontName) {
			case 'Standard': {
				// @ts-expect-error figlet importable-fonts have no type declarations
				const m = await import('figlet/importable-fonts/Standard');
				return m.default ?? m;
			}
			case 'Banner': {
				// @ts-expect-error figlet importable-fonts have no type declarations
				const m = await import('figlet/importable-fonts/Banner');
				return m.default ?? m;
			}
			case 'Big': {
				// @ts-expect-error figlet importable-fonts have no type declarations
				const m = await import('figlet/importable-fonts/Big');
				return m.default ?? m;
			}
			case 'Slant': {
				// @ts-expect-error figlet importable-fonts have no type declarations
				const m = await import('figlet/importable-fonts/Slant');
				return m.default ?? m;
			}
			case 'Small': {
				// @ts-expect-error figlet importable-fonts have no type declarations
				const m = await import('figlet/importable-fonts/Small');
				return m.default ?? m;
			}
		}
	}

	async function generateAscii(currentText: string, currentFont: FontName): Promise<void> {
		if (!currentText.trim()) {
			output = '';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			await loadFont(currentFont);
			const figlet = await import('figlet');
			const result = figlet.default.textSync(currentText, { font: currentFont });
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
			font = value as FontName;
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
					{FONTS.find((f) => f.value === font)?.label ?? 'Select font'}
				</Select.Trigger>
				<Select.Content>
					{#each FONTS as f (f.value)}
						<Select.Item value={f.value}>{f.label}</Select.Item>
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
