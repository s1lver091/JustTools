<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import {
		imageDataToAscii,
		CHARACTER_RAMPS,
		type RampPreset
	} from '$lib/utils/ascii-convert';

	interface Props {
		output: string;
	}

	let { output = $bindable('') }: Props = $props();

	const RAMP_OPTIONS: { value: RampPreset | 'custom'; label: string }[] = [
		{ value: 'standard', label: 'Standard' },
		{ value: 'block', label: 'Block' },
		{ value: 'dense', label: 'Dense' },
		{ value: 'custom', label: 'Custom' }
	];

	let imageSrc = $state('');
	let width = $state(80);
	let invert = $state(false);
	let rampPreset = $state<RampPreset | 'custom'>('standard');
	let customRamp = $state(' .:-=+*#%@');
	let canvasRef = $state<HTMLCanvasElement | null>(null);
	let imageData = $state<ImageData | null>(null);

	const currentRamp = $derived(
		rampPreset === 'custom' ? customRamp : CHARACTER_RAMPS[rampPreset]
	);

	function handleFiles(files: File[]): void {
		const file = files[0];
		if (!file || !file.type.startsWith('image/')) return;

		if (imageSrc.startsWith('blob:')) {
			URL.revokeObjectURL(imageSrc);
		}

		const objectUrl = URL.createObjectURL(file);
		imageSrc = objectUrl;
		loadImageData(objectUrl);
	}

	$effect(() => {
		return () => {
			if (imageSrc.startsWith('blob:')) {
				URL.revokeObjectURL(imageSrc);
			}
		};
	});

	function loadImageData(src: string): void {
		const img = new Image();
		img.onload = () => {
			const canvas = canvasRef ?? document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0);
			imageData = ctx.getImageData(0, 0, img.width, img.height);
		};
		img.src = src;
	}

	$effect(() => {
		if (!imageData) {
			output = '';
			return;
		}
		const ramp = currentRamp;
		const w = width;
		const inv = invert;
		output = imageDataToAscii(imageData, { width: w, ramp, invert: inv });
	});

	function handleRampChange(value: string | undefined): void {
		if (value) {
			rampPreset = value as RampPreset | 'custom';
		}
	}
</script>

<div class="space-y-4">
	{#if !imageSrc}
		<FileDropzone accept="image/*" onFiles={handleFiles} />
	{:else}
		<div class="flex flex-wrap items-end gap-4">
			<button
				class="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
				onclick={() => {
					imageSrc = '';
					imageData = null;
					output = '';
				}}
			>
				Choose a different image
			</button>
		</div>
	{/if}

	<canvas bind:this={canvasRef} class="hidden"></canvas>

	{#if imageSrc}
		<div class="grid gap-4 sm:grid-cols-3">
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label>Width (characters)</Label>
					<span class="text-muted-foreground font-mono text-sm">{width}</span>
				</div>
				<input
					type="range"
					min={40}
					max={200}
					step={1}
					bind:value={width}
					class="w-full accent-cyan-500"
				/>
			</div>

			<div class="space-y-2">
				<Label>Character Set</Label>
				<Select.Root type="single" value={rampPreset} onValueChange={handleRampChange}>
					<Select.Trigger class="w-full">
						{RAMP_OPTIONS.find((r) => r.value === rampPreset)?.label ?? 'Select'}
					</Select.Trigger>
					<Select.Content>
						{#each RAMP_OPTIONS as r (r.value)}
							<Select.Item value={r.value}>{r.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex items-end">
				<label class="flex items-center justify-between gap-3 rounded-lg border p-3">
					<span class="text-sm">Invert</span>
					<Switch bind:checked={invert} />
				</label>
			</div>
		</div>

		{#if rampPreset === 'custom'}
			<div class="space-y-2">
				<Label>Custom Ramp (lightest to darkest)</Label>
				<Input bind:value={customRamp} placeholder=" .:-=+*#%@" />
			</div>
		{/if}
	{/if}

	{#if output}
		<div class="bg-muted overflow-x-auto rounded-lg p-4">
			<pre class="text-foreground text-xs leading-tight">{output}</pre>
		</div>
	{:else if imageSrc}
		<div class="bg-muted rounded-lg p-4">
			<p class="text-muted-foreground text-sm">Processing image...</p>
		</div>
	{/if}
</div>
