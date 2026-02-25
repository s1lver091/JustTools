<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import FileDropzone from '$lib/components/shared/FileDropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Camera,
		Settings,
		MapPin,
		Calendar,
		Code,
		Trash2,
		Download,
		ImagePlus,
		ChevronDown,
		ChevronRight,
		ExternalLink
	} from '@lucide/svelte';
	import { readExif, stripExif, type ExifData } from '$lib/utils/image-exif';
	import { downloadBlob, formatFileSize } from '$lib/utils/image-export';
	import { ACCEPTED_IMAGE_TYPES } from '$lib/utils/image-types';

	let file = $state<File | null>(null);
	let fileName = $state('');
	let exifData = $state<ExifData | null>(null);
	let loading = $state(false);
	let noExif = $state(false);
	let showRaw = $state(false);
	let stripping = $state(false);

	async function handleFiles(files: File[]): Promise<void> {
		const f = files[0];
		if (!f) return;
		file = f;
		fileName = f.name;
		loading = true;
		noExif = false;

		const data = await readExif(f);
		if (data) {
			exifData = data;
			noExif = false;
		} else {
			exifData = null;
			noExif = true;
		}
		loading = false;
	}

	function loadAnother(): void {
		file = null;
		exifData = null;
		noExif = false;
	}

	async function removeAllMetadata(): Promise<void> {
		if (!file) return;
		stripping = true;
		try {
			const cleanBlob = await stripExif(file);
			const baseName = fileName.replace(/\.[^.]+$/, '');
			const ext = fileName.match(/\.[^.]+$/)?.[0] ?? '.jpg';
			downloadBlob(cleanBlob, `${baseName}-no-exif${ext}`);
		} finally {
			stripping = false;
		}
	}

	function formatDate(d: Date | undefined): string {
		if (!d) return 'Unknown';
		return d.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatCoord(val: number | undefined): string {
		if (val === undefined) return '?';
		return val.toFixed(6);
	}

	let rawEntries = $derived.by(() => {
		if (!exifData?.raw) return [];
		return Object.entries(exifData.raw)
			.filter(([, v]) => v !== undefined && v !== null)
			.sort(([a], [b]) => a.localeCompare(b));
	});

	let fieldCount = $derived(rawEntries.length);
</script>

<ToolHeader
	title="EXIF Data"
	description="View and remove image metadata"
/>

{#if !file}
	<FileDropzone accept={ACCEPTED_IMAGE_TYPES} onFiles={handleFiles} />
{:else if loading}
	<div class="flex items-center justify-center py-12">
		<p class="text-muted-foreground">Reading metadata...</p>
	</div>
{:else}
	<div class="mx-auto max-w-2xl space-y-4">
		<!-- File info bar -->
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="min-w-0">
				<p class="truncate font-medium">{fileName}</p>
				<p class="text-muted-foreground text-sm">{formatFileSize(file.size)}</p>
			</div>
			<Button variant="ghost" size="sm" onclick={loadAnother}>
				<ImagePlus class="mr-1 size-4" /> New
			</Button>
		</div>

		{#if noExif}
			<Card.Root>
				<Card.Content class="py-8 text-center">
					<p class="text-muted-foreground">No EXIF data found in this image.</p>
					<p class="text-muted-foreground mt-1 text-sm">
						PNG, WebP, and GIF files may have limited metadata.
					</p>
				</Card.Content>
			</Card.Root>
		{:else if exifData}
			<!-- Metadata count -->
			<Badge variant="secondary">{fieldCount} metadata fields</Badge>

			<!-- Camera -->
			{#if exifData.camera?.make || exifData.camera?.model}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="flex items-center gap-2 text-sm">
							<Camera class="size-4" /> Camera
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							{#if exifData.camera.make}
								<dt class="text-muted-foreground">Make</dt>
								<dd>{exifData.camera.make}</dd>
							{/if}
							{#if exifData.camera.model}
								<dt class="text-muted-foreground">Model</dt>
								<dd>{exifData.camera.model}</dd>
							{/if}
						</dl>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Settings -->
			{#if exifData.settings?.iso || exifData.settings?.aperture || exifData.settings?.shutterSpeed || exifData.settings?.focalLength}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="flex items-center gap-2 text-sm">
							<Settings class="size-4" /> Camera Settings
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							{#if exifData.settings.iso}
								<dt class="text-muted-foreground">ISO</dt>
								<dd>{exifData.settings.iso}</dd>
							{/if}
							{#if exifData.settings.aperture}
								<dt class="text-muted-foreground">Aperture</dt>
								<dd>f/{exifData.settings.aperture}</dd>
							{/if}
							{#if exifData.settings.shutterSpeed}
								<dt class="text-muted-foreground">Shutter Speed</dt>
								<dd>{exifData.settings.shutterSpeed}</dd>
							{/if}
							{#if exifData.settings.focalLength}
								<dt class="text-muted-foreground">Focal Length</dt>
								<dd>{exifData.settings.focalLength}mm</dd>
							{/if}
						</dl>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- GPS -->
			{#if exifData.gps}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="flex items-center gap-2 text-sm">
							<MapPin class="size-4" /> Location
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						<dl class="grid grid-cols-2 gap-2 text-sm">
							<dt class="text-muted-foreground">Latitude</dt>
							<dd>{formatCoord(exifData.gps.latitude)}</dd>
							<dt class="text-muted-foreground">Longitude</dt>
							<dd>{formatCoord(exifData.gps.longitude)}</dd>
							{#if exifData.gps.altitude !== undefined}
								<dt class="text-muted-foreground">Altitude</dt>
								<dd>{exifData.gps.altitude}m</dd>
							{/if}
						</dl>
						{#if exifData.gps.latitude && exifData.gps.longitude}
							<a
								href="https://www.openstreetmap.org/?mlat={exifData.gps.latitude}&mlon={exifData.gps.longitude}#map=15/{exifData.gps.latitude}/{exifData.gps.longitude}"
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary inline-flex items-center gap-1 text-sm hover:underline"
							>
								View on map <ExternalLink class="size-3" />
							</a>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Date -->
			{#if exifData.date?.taken || exifData.date?.modified}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="flex items-center gap-2 text-sm">
							<Calendar class="size-4" /> Date
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							{#if exifData.date.taken}
								<dt class="text-muted-foreground">Taken</dt>
								<dd>{formatDate(exifData.date.taken)}</dd>
							{/if}
							{#if exifData.date.modified}
								<dt class="text-muted-foreground">Modified</dt>
								<dd>{formatDate(exifData.date.modified)}</dd>
							{/if}
						</dl>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Software -->
			{#if exifData.software}
				<Card.Root>
					<Card.Content class="pt-6">
						<dl class="grid grid-cols-2 gap-2 text-sm">
							<dt class="text-muted-foreground">Software</dt>
							<dd>{exifData.software}</dd>
						</dl>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Raw data toggle -->
			<Button variant="ghost" size="sm" onclick={() => { showRaw = !showRaw; }}>
				{#if showRaw}
					<ChevronDown class="mr-1 size-4" />
				{:else}
					<ChevronRight class="mr-1 size-4" />
				{/if}
				<Code class="mr-1 size-4" /> Show All Raw Data ({fieldCount})
			</Button>

			{#if showRaw}
				<Card.Root>
					<Card.Content class="max-h-96 overflow-y-auto pt-6">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b">
									<th class="text-muted-foreground pb-2 text-left font-medium">Key</th>
									<th class="text-muted-foreground pb-2 text-left font-medium">Value</th>
								</tr>
							</thead>
							<tbody>
								{#each rawEntries as [key, value]}
									<tr class="border-b border-dashed">
										<td class="py-1 pr-4 font-mono">{key}</td>
										<td class="py-1 break-all">{String(value)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</Card.Content>
				</Card.Root>
			{/if}

			<Separator />

			<!-- Remove metadata actions -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-sm">Remove Metadata</Card.Title>
					<Card.Description>
						Download a clean copy with metadata stripped
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex gap-2">
					<Button variant="destructive" size="sm" onclick={removeAllMetadata} disabled={stripping}>
						<Trash2 class="mr-1 size-4" />
						{stripping ? 'Removing...' : 'Remove All Metadata'}
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
{/if}
