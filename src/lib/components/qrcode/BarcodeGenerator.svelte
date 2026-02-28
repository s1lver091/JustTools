<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Slider } from '$lib/components/ui/slider';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import CodePreview from './CodePreview.svelte';
	import { Settings, ChevronDown, AlertCircle } from '@lucide/svelte';
	import {
		type BarcodeFormat,
		BARCODE_FORMATS,
		BARCODE_FORMAT_GROUPS
	} from '$lib/utils/qr-helpers';

	let selectedFormat = $state<BarcodeFormat>('CODE128');
	let inputValue = $state('');

	// Customization options
	let barWidth = $state(2);
	let barHeight = $state(100);
	let showText = $state(true);
	let fontSize = $state(14);
	let fgColor = $state('#000000');
	let bgColor = $state('#ffffff');
	let optionsOpen = $state(false);

	let svgEl = $state<SVGSVGElement | null>(null);
	let error = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const formatInfo = $derived(BARCODE_FORMATS.find((f) => f.value === selectedFormat));
	const validationError = $derived(formatInfo?.validate(inputValue) ?? null);
	const hasContent = $derived(inputValue.length > 0 && !validationError);

	$effect(() => {
		const format = selectedFormat;
		const value = inputValue;
		const width = barWidth;
		const height = barHeight;
		const text = showText;
		const fSize = fontSize;
		const fg = fgColor;
		const bg = bgColor;

		clearTimeout(debounceTimer);
		if (!value || !svgEl || validationError) {
			error = '';
			return;
		}

		debounceTimer = setTimeout(async () => {
			try {
				const JsBarcode = (await import('jsbarcode')).default;
				JsBarcode(svgEl, value, {
					format,
					width,
					height,
					displayValue: text,
					fontSize: fSize,
					lineColor: fg,
					background: bg,
					margin: 10,
					valid: (valid: boolean) => {
						if (!valid) {
							error = 'Invalid input for selected barcode format';
						}
					}
				});
				error = '';
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to generate barcode';
			}
		}, 300);
	});

	function handleFormatChange(value: string | undefined) {
		if (value) {
			selectedFormat = value as BarcodeFormat;
			inputValue = '';
			error = '';
		}
	}
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Input panel -->
	<div class="space-y-4">
		<!-- Format selector -->
		<div class="space-y-2">
			<Label>Barcode Format</Label>
			<Select.Root type="single" value={selectedFormat} onValueChange={handleFormatChange}>
				<Select.Trigger class="w-full">
					{formatInfo?.label ?? 'Select format'}
				</Select.Trigger>
				<Select.Content>
					{#each BARCODE_FORMAT_GROUPS as group (group.label)}
						<Select.Group>
							<Select.GroupHeading>{group.label}</Select.GroupHeading>
							{#each group.formats as fmt (fmt)}
								{@const fmtInfo = BARCODE_FORMATS.find((f) => f.value === fmt)}
								{#if fmtInfo}
									<Select.Item value={fmtInfo.value}>
										<div>
											<div>{fmtInfo.label}</div>
											<div class="text-muted-foreground text-xs">{fmtInfo.description}</div>
										</div>
									</Select.Item>
								{/if}
							{/each}
						</Select.Group>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		{#if formatInfo}
			<p class="text-muted-foreground text-xs">{formatInfo.description}</p>
		{/if}

		<!-- Value input -->
		<div class="space-y-2">
			<Label for="barcode-input">Value</Label>
			<Input
				id="barcode-input"
				bind:value={inputValue}
				placeholder={formatInfo?.placeholder ?? 'Enter value'}
			/>
			{#if validationError && inputValue.length > 0}
				<p class="flex items-center gap-1 text-xs text-red-500">
					<AlertCircle class="size-3.5" />
					{validationError}
				</p>
			{/if}
		</div>

		<!-- Customization options -->
		<Collapsible.Root bind:open={optionsOpen}>
			<Collapsible.Trigger
				class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 py-2 text-sm font-medium transition-colors"
			>
				<Settings class="size-4" />
				Customization
				<ChevronDown
					class="ml-auto size-4 transition-transform {optionsOpen ? 'rotate-180' : ''}"
				/>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<div class="space-y-4 pt-2">
					<div class="space-y-2">
						<Label>Bar Width: {barWidth}px</Label>
						<Slider type="single" bind:value={barWidth} min={1} max={4} step={1} />
					</div>
					<div class="space-y-2">
						<Label>Height: {barHeight}px</Label>
						<Slider type="single" bind:value={barHeight} min={50} max={200} step={10} />
					</div>
					<div class="flex items-center gap-2">
						<Switch bind:checked={showText} />
						<Label>Show text below barcode</Label>
					</div>
					{#if showText}
						<div class="space-y-2">
							<Label>Font Size: {fontSize}px</Label>
							<Slider type="single" bind:value={fontSize} min={10} max={24} step={1} />
						</div>
					{/if}
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="bc-fg">Foreground Color</Label>
							<div class="flex items-center gap-2">
								<input
									id="bc-fg"
									type="color"
									bind:value={fgColor}
									class="size-9 cursor-pointer rounded border-0"
								/>
								<Input
									value={fgColor}
									oninput={(e) => (fgColor = (e.target as HTMLInputElement).value)}
									class="flex-1 font-mono text-xs"
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="bc-bg">Background Color</Label>
							<div class="flex items-center gap-2">
								<input
									id="bc-bg"
									type="color"
									bind:value={bgColor}
									class="size-9 cursor-pointer rounded border-0"
								/>
								<Input
									value={bgColor}
									oninput={(e) => (bgColor = (e.target as HTMLInputElement).value)}
									class="flex-1 font-mono text-xs"
								/>
							</div>
						</div>
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		{#if error}
			<p class="text-sm text-red-500">{error}</p>
		{/if}
	</div>

	<!-- Preview panel -->
	<CodePreview mode="svg" svgEl={svgEl} {hasContent} filename="barcode-{selectedFormat}">
		<svg bind:this={svgEl} class="max-w-full"></svg>
	</CodePreview>
</div>
