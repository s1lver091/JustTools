<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	interface FontEntry {
		value: string;
		label: string;
	}

	interface FontCategory {
		label: string;
		fonts: FontEntry[];
	}

	interface Props {
		output: string;
	}

	let { output = $bindable('') }: Props = $props();

	const FONT_CATEGORIES: FontCategory[] = [
		{
			label: 'Classic',
			fonts: [
				{ value: 'Standard', label: 'Standard' },
				{ value: 'Big', label: 'Big' },
				{ value: 'Small', label: 'Small' },
				{ value: 'Mini', label: 'Mini' },
				{ value: 'Banner', label: 'Banner' },
				{ value: 'Banner3', label: 'Banner 3' },
				{ value: 'Block', label: 'Block' },
				{ value: 'Bubble', label: 'Bubble' },
				{ value: 'Lean', label: 'Lean' },
				{ value: 'Letters', label: 'Letters' }
			]
		},
		{
			label: 'Stylish',
			fonts: [
				{ value: 'Slant', label: 'Slant' },
				{ value: 'Small Slant', label: 'Small Slant' },
				{ value: 'Shadow', label: 'Shadow' },
				{ value: 'Small Shadow', label: 'Small Shadow' },
				{ value: 'Italic', label: 'Italic' },
				{ value: 'Script', label: 'Script' },
				{ value: 'Cursive', label: 'Cursive' },
				{ value: 'Graceful', label: 'Graceful' },
				{ value: 'Wavy', label: 'Wavy' },
				{ value: 'Twisted', label: 'Twisted' }
			]
		},
		{
			label: 'Bold & Heavy',
			fonts: [
				{ value: 'Colossal', label: 'Colossal' },
				{ value: 'Doom', label: 'Doom' },
				{ value: 'Epic', label: 'Epic' },
				{ value: 'Gothic', label: 'Gothic' },
				{ value: 'Stop', label: 'Stop' },
				{ value: 'Thick', label: 'Thick' },
				{ value: 'Bloody', label: 'Bloody' },
				{ value: 'Poison', label: 'Poison' },
				{ value: 'Graffiti', label: 'Graffiti' },
				{ value: 'Roman', label: 'Roman' }
			]
		},
		{
			label: '3D & Decorative',
			fonts: [
				{ value: '3-D', label: '3-D' },
				{ value: '3D-ASCII', label: '3D ASCII' },
				{ value: 'Isometric1', label: 'Isometric 1' },
				{ value: 'Isometric3', label: 'Isometric 3' },
				{ value: 'Larry 3D', label: 'Larry 3D' },
				{ value: 'Henry 3D', label: 'Henry 3D' },
				{ value: 'Stforek', label: 'Stforek' },
				{ value: 'Modular', label: 'Modular' },
				{ value: 'Relief', label: 'Relief' },
				{ value: 'Impossible', label: 'Impossible' }
			]
		},
		{
			label: 'Fun & Playful',
			fonts: [
				{ value: 'Star Wars', label: 'Star Wars' },
				{ value: 'DOS Rebel', label: 'DOS Rebel' },
				{ value: 'ANSI Shadow', label: 'ANSI Shadow' },
				{ value: 'Electronic', label: 'Electronic' },
				{ value: 'Digital', label: 'Digital' },
				{ value: 'Cyberlarge', label: 'Cyberlarge' },
				{ value: 'Speed', label: 'Speed' },
				{ value: 'Tinker-Toy', label: 'Tinker-Toy' },
				{ value: 'Weird', label: 'Weird' },
				{ value: 'Whimsy', label: 'Whimsy' }
			]
		},
		{
			label: 'Compact & Minimal',
			fonts: [
				{ value: 'Straight', label: 'Straight' },
				{ value: 'Thin', label: 'Thin' },
				{ value: 'Short', label: 'Short' },
				{ value: 'Term', label: 'Term' },
				{ value: 'Bright', label: 'Bright' },
				{ value: 'Ogre', label: 'Ogre' },
				{ value: 'Rectangles', label: 'Rectangles' },
				{ value: 'Stampate', label: 'Stampate' },
				{ value: 'Serifcap', label: 'Serifcap' },
				{ value: 'Calvin S', label: 'Calvin S' }
			]
		},
		{
			label: 'Special',
			fonts: [
				{ value: 'Fraktur', label: 'Fraktur' },
				{ value: 'Runic', label: 'Runic' },
				{ value: 'Greek', label: 'Greek' },
				{ value: 'Morse', label: 'Morse' },
				{ value: 'Binary', label: 'Binary' },
				{ value: 'Hex', label: 'Hex' },
				{ value: 'Braced', label: 'Braced' },
				{ value: 'Cards', label: 'Cards' },
				{ value: 'Keyboard', label: 'Keyboard' },
				{ value: 'Tiles', label: 'Tiles' }
			]
		}
	];

	const ALL_FONTS = FONT_CATEGORIES.flatMap((c) => c.fonts);

	let text = $state('Hello');
	let font = $state('Standard');
	let loading = $state(false);
	let errorMessage = $state('');

	const loadedFonts = new Set<string>();

	const FONT_IMPORTS: Record<string, () => Promise<{ default: string }>> = {
		/* Classic */
		// @ts-expect-error figlet font modules lack explicit type exports
		Standard: () => import('figlet/importable-fonts/Standard'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Big: () => import('figlet/importable-fonts/Big'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Small: () => import('figlet/importable-fonts/Small'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Mini: () => import('figlet/importable-fonts/Mini'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Banner: () => import('figlet/importable-fonts/Banner'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Banner3: () => import('figlet/importable-fonts/Banner3'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Block: () => import('figlet/importable-fonts/Block'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Bubble: () => import('figlet/importable-fonts/Bubble'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Lean: () => import('figlet/importable-fonts/Lean'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Letters: () => import('figlet/importable-fonts/Letters'),
		/* Stylish */
		// @ts-expect-error figlet font modules lack explicit type exports
		Slant: () => import('figlet/importable-fonts/Slant'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'Small Slant': () => import('figlet/importable-fonts/Small Slant'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Shadow: () => import('figlet/importable-fonts/Shadow'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'Small Shadow': () => import('figlet/importable-fonts/Small Shadow'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Italic: () => import('figlet/importable-fonts/Italic'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Script: () => import('figlet/importable-fonts/Script'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Cursive: () => import('figlet/importable-fonts/Cursive'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Graceful: () => import('figlet/importable-fonts/Graceful'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Wavy: () => import('figlet/importable-fonts/Wavy'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Twisted: () => import('figlet/importable-fonts/Twisted'),
		/* Bold & Heavy */
		// @ts-expect-error figlet font modules lack explicit type exports
		Colossal: () => import('figlet/importable-fonts/Colossal'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Doom: () => import('figlet/importable-fonts/Doom'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Epic: () => import('figlet/importable-fonts/Epic'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Gothic: () => import('figlet/importable-fonts/Gothic'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Stop: () => import('figlet/importable-fonts/Stop'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Thick: () => import('figlet/importable-fonts/Thick'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Bloody: () => import('figlet/importable-fonts/Bloody'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Poison: () => import('figlet/importable-fonts/Poison'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Graffiti: () => import('figlet/importable-fonts/Graffiti'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Roman: () => import('figlet/importable-fonts/Roman'),
		/* 3D & Decorative */
		// @ts-expect-error figlet font modules lack explicit type exports
		'3-D': () => import('figlet/importable-fonts/3-D'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'3D-ASCII': () => import('figlet/importable-fonts/3D-ASCII'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Isometric1: () => import('figlet/importable-fonts/Isometric1'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Isometric3: () => import('figlet/importable-fonts/Isometric3'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'Larry 3D': () => import('figlet/importable-fonts/Larry 3D'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'Henry 3D': () => import('figlet/importable-fonts/Henry 3D'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Stforek: () => import('figlet/importable-fonts/Stforek'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Modular: () => import('figlet/importable-fonts/Modular'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Relief: () => import('figlet/importable-fonts/Relief'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Impossible: () => import('figlet/importable-fonts/Impossible'),
		/* Fun & Playful */
		// @ts-expect-error figlet font modules lack explicit type exports
		'Star Wars': () => import('figlet/importable-fonts/Star Wars'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'DOS Rebel': () => import('figlet/importable-fonts/DOS Rebel'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'ANSI Shadow': () => import('figlet/importable-fonts/ANSI Shadow'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Electronic: () => import('figlet/importable-fonts/Electronic'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Digital: () => import('figlet/importable-fonts/Digital'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Cyberlarge: () => import('figlet/importable-fonts/Cyberlarge'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Speed: () => import('figlet/importable-fonts/Speed'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'Tinker-Toy': () => import('figlet/importable-fonts/Tinker-Toy'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Weird: () => import('figlet/importable-fonts/Weird'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Whimsy: () => import('figlet/importable-fonts/Whimsy'),
		/* Compact & Minimal */
		// @ts-expect-error figlet font modules lack explicit type exports
		Straight: () => import('figlet/importable-fonts/Straight'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Thin: () => import('figlet/importable-fonts/Thin'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Short: () => import('figlet/importable-fonts/Short'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Term: () => import('figlet/importable-fonts/Term'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Bright: () => import('figlet/importable-fonts/Bright'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Ogre: () => import('figlet/importable-fonts/Ogre'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Rectangles: () => import('figlet/importable-fonts/Rectangles'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Stampate: () => import('figlet/importable-fonts/Stampate'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Serifcap: () => import('figlet/importable-fonts/Serifcap'),
		// @ts-expect-error figlet font modules lack explicit type exports
		'Calvin S': () => import('figlet/importable-fonts/Calvin S'),
		/* Special */
		// @ts-expect-error figlet font modules lack explicit type exports
		Fraktur: () => import('figlet/importable-fonts/Fraktur'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Runic: () => import('figlet/importable-fonts/Runic'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Greek: () => import('figlet/importable-fonts/Greek'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Morse: () => import('figlet/importable-fonts/Morse'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Binary: () => import('figlet/importable-fonts/Binary'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Hex: () => import('figlet/importable-fonts/Hex'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Braced: () => import('figlet/importable-fonts/Braced'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Cards: () => import('figlet/importable-fonts/Cards'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Keyboard: () => import('figlet/importable-fonts/Keyboard'),
		// @ts-expect-error figlet font modules lack explicit type exports
		Tiles: () => import('figlet/importable-fonts/Tiles')
	};

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
