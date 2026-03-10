<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Slider } from '$lib/components/ui/slider';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import CodePreview from './CodePreview.svelte';
	import { Settings, ChevronDown } from '@lucide/svelte';
	import { downloadBlob } from '$lib/utils/download';
	import {
		type QrContentType,
		type WifiData,
		type VCardData,
		type EmailData,
		type SmsData,
		type GeoData,
		type WifiEncryption,
		QR_CONTENT_TYPES,
		formatQrContent
	} from '$lib/utils/qr-helpers';

	type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

	const ERROR_LEVELS: { value: ErrorCorrectionLevel; label: string; description: string }[] = [
		{ value: 'L', label: 'Low (7%)', description: '7% recovery' },
		{ value: 'M', label: 'Medium (15%)', description: '15% recovery' },
		{ value: 'Q', label: 'Quartile (25%)', description: '25% recovery' },
		{ value: 'H', label: 'High (30%)', description: '30% recovery' }
	];

	let contentType = $state<QrContentType>('text');
	let textContent = $state('');

	// WiFi fields
	let wifiSsid = $state('');
	let wifiPassword = $state('');
	let wifiEncryption = $state<WifiEncryption>('WPA');
	let wifiHidden = $state(false);

	// vCard fields
	let vcardFirstName = $state('');
	let vcardLastName = $state('');
	let vcardPhone = $state('');
	let vcardEmail = $state('');
	let vcardOrg = $state('');
	let vcardTitle = $state('');
	let vcardUrl = $state('');

	// Email fields
	let emailAddress = $state('');
	let emailSubject = $state('');
	let emailBody = $state('');

	// Phone field
	let phoneNumber = $state('');

	// SMS fields
	let smsNumber = $state('');
	let smsMessage = $state('');

	// Geo fields
	let geoLatitude = $state('');
	let geoLongitude = $state('');

	// Customization options
	let qrSize = $state(300);
	let fgColor = $state('#000000');
	let bgColor = $state('#ffffff');
	let errorLevel = $state<ErrorCorrectionLevel>('M');
	let margin = $state(4);
	let optionsOpen = $state(false);

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let error = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const qrContent = $derived.by(() => {
		switch (contentType) {
			case 'wifi': {
				const data: WifiData = {
					ssid: wifiSsid,
					password: wifiPassword,
					encryption: wifiEncryption,
					hidden: wifiHidden
				};
				return data.ssid ? formatQrContent('wifi', data) : '';
			}
			case 'vcard': {
				const data: VCardData = {
					firstName: vcardFirstName,
					lastName: vcardLastName,
					phone: vcardPhone,
					email: vcardEmail,
					org: vcardOrg,
					title: vcardTitle,
					url: vcardUrl
				};
				return data.firstName || data.lastName ? formatQrContent('vcard', data) : '';
			}
			case 'email': {
				const data: EmailData = {
					address: emailAddress,
					subject: emailSubject,
					body: emailBody
				};
				return data.address ? formatQrContent('email', data) : '';
			}
			case 'phone':
				return phoneNumber ? formatQrContent('phone', phoneNumber) : '';
			case 'sms': {
				const data: SmsData = { number: smsNumber, message: smsMessage };
				return data.number ? formatQrContent('sms', data) : '';
			}
			case 'geo': {
				const data: GeoData = { latitude: geoLatitude, longitude: geoLongitude };
				return data.latitude && data.longitude ? formatQrContent('geo', data) : '';
			}
			case 'url':
			case 'text':
			default:
				return textContent;
		}
	});

	const hasContent = $derived(qrContent.length > 0);

	const PREVIEW_SIZE = 300;

	$effect(() => {
		const content = qrContent;
		const fg = fgColor;
		const bg = bgColor;
		const level = errorLevel;
		const m = margin;

		clearTimeout(debounceTimer);
		if (!content || !canvasEl) {
			if (canvasEl) {
				const ctx = canvasEl.getContext('2d');
				if (ctx) {
					canvasEl.width = 0;
					canvasEl.height = 0;
				}
			}
			error = '';
			return;
		}

		debounceTimer = setTimeout(async () => {
			try {
				const QRCode = await import('qrcode');
				await QRCode.toCanvas(canvasEl, content, {
					width: PREVIEW_SIZE,
					color: { dark: fg, light: bg },
					errorCorrectionLevel: level,
					margin: m
				});
				error = '';
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to generate QR code';
			}
		}, 300);
	});

	async function exportQrPng() {
		if (!qrContent) return;
		try {
			const QRCode = await import('qrcode');
			const offscreen = document.createElement('canvas');
			await QRCode.toCanvas(offscreen, qrContent, {
				width: qrSize,
				color: { dark: fgColor, light: bgColor },
				errorCorrectionLevel: errorLevel,
				margin
			});
			const blob = await new Promise<Blob | null>((resolve) =>
				offscreen.toBlob((b) => resolve(b), 'image/png')
			);
			if (!blob) return;
			downloadBlob(blob, `qrcode-${Date.now()}.png`);
		} catch {
			// silently ignore export errors
		}
	}

	function handleContentTypeChange(value: string | undefined) {
		if (value) contentType = value as QrContentType;
	}

	function handleErrorLevelChange(value: string | undefined) {
		if (value) errorLevel = value as ErrorCorrectionLevel;
	}

	function handleWifiEncryptionChange(value: string | undefined) {
		if (value) wifiEncryption = value as WifiEncryption;
	}
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Input panel -->
	<div class="space-y-4">
		<!-- Content type selector -->
		<div class="space-y-2">
			<Label>Content Type</Label>
			<Select.Root type="single" value={contentType} onValueChange={handleContentTypeChange}>
				<Select.Trigger class="w-full">
					{QR_CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? 'Select type'}
				</Select.Trigger>
				<Select.Content>
					{#each QR_CONTENT_TYPES as ct (ct.value)}
						<Select.Item value={ct.value}>{ct.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Dynamic input fields -->
		{#if contentType === 'text'}
			<div class="space-y-2">
				<Label for="qr-text">Text</Label>
				<textarea
					id="qr-text"
					bind:value={textContent}
					class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					placeholder="Enter text to encode"
				></textarea>
			</div>
		{:else if contentType === 'url'}
			<div class="space-y-2">
				<Label for="qr-url">URL</Label>
				<Input id="qr-url" bind:value={textContent} placeholder="https://example.com" />
			</div>
		{:else if contentType === 'wifi'}
			<div class="space-y-3">
				<div class="space-y-2">
					<Label for="wifi-ssid">Network Name (SSID)</Label>
					<Input id="wifi-ssid" bind:value={wifiSsid} placeholder="MyNetwork" />
				</div>
				<div class="space-y-2">
					<Label>Encryption</Label>
					<Select.Root
						type="single"
						value={wifiEncryption}
						onValueChange={handleWifiEncryptionChange}
					>
						<Select.Trigger class="w-full">
							{wifiEncryption === 'nopass' ? 'None' : wifiEncryption}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="WPA">WPA/WPA2</Select.Item>
							<Select.Item value="WEP">WEP</Select.Item>
							<Select.Item value="nopass">None (Open)</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				{#if wifiEncryption !== 'nopass'}
					<div class="space-y-2">
						<Label for="wifi-pass">Password</Label>
						<Input id="wifi-pass" bind:value={wifiPassword} placeholder="Password" />
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<Switch bind:checked={wifiHidden} />
					<Label>Hidden network</Label>
				</div>
			</div>
		{:else if contentType === 'vcard'}
			<div class="space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="vc-first">First Name</Label>
						<Input id="vc-first" bind:value={vcardFirstName} placeholder="John" />
					</div>
					<div class="space-y-2">
						<Label for="vc-last">Last Name</Label>
						<Input id="vc-last" bind:value={vcardLastName} placeholder="Doe" />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="vc-phone">Phone</Label>
					<Input id="vc-phone" bind:value={vcardPhone} placeholder="+1234567890" />
				</div>
				<div class="space-y-2">
					<Label for="vc-email">Email</Label>
					<Input id="vc-email" bind:value={vcardEmail} placeholder="john@example.com" />
				</div>
				<div class="space-y-2">
					<Label for="vc-org">Organization</Label>
					<Input id="vc-org" bind:value={vcardOrg} placeholder="Company Inc." />
				</div>
				<div class="space-y-2">
					<Label for="vc-title">Title</Label>
					<Input id="vc-title" bind:value={vcardTitle} placeholder="Software Engineer" />
				</div>
				<div class="space-y-2">
					<Label for="vc-url">Website</Label>
					<Input id="vc-url" bind:value={vcardUrl} placeholder="https://example.com" />
				</div>
			</div>
		{:else if contentType === 'email'}
			<div class="space-y-3">
				<div class="space-y-2">
					<Label for="email-addr">Email Address</Label>
					<Input id="email-addr" bind:value={emailAddress} placeholder="user@example.com" />
				</div>
				<div class="space-y-2">
					<Label for="email-subject">Subject</Label>
					<Input id="email-subject" bind:value={emailSubject} placeholder="Optional subject" />
				</div>
				<div class="space-y-2">
					<Label for="email-body">Body</Label>
					<textarea
						id="email-body"
						bind:value={emailBody}
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						placeholder="Optional message body"
					></textarea>
				</div>
			</div>
		{:else if contentType === 'phone'}
			<div class="space-y-2">
				<Label for="phone-num">Phone Number</Label>
				<Input id="phone-num" bind:value={phoneNumber} placeholder="+1234567890" />
			</div>
		{:else if contentType === 'sms'}
			<div class="space-y-3">
				<div class="space-y-2">
					<Label for="sms-num">Phone Number</Label>
					<Input id="sms-num" bind:value={smsNumber} placeholder="+1234567890" />
				</div>
				<div class="space-y-2">
					<Label for="sms-msg">Message</Label>
					<textarea
						id="sms-msg"
						bind:value={smsMessage}
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						placeholder="Optional message"
					></textarea>
				</div>
			</div>
		{:else if contentType === 'geo'}
			<div class="space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="geo-lat">Latitude</Label>
						<Input id="geo-lat" bind:value={geoLatitude} placeholder="37.7749" />
					</div>
					<div class="space-y-2">
						<Label for="geo-lng">Longitude</Label>
						<Input id="geo-lng" bind:value={geoLongitude} placeholder="-122.4194" />
					</div>
				</div>
			</div>
		{/if}

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
						<Label>Size: {qrSize}px</Label>
						<Slider type="single" bind:value={qrSize} min={100} max={1000} step={10} />
					</div>
					<div class="space-y-2">
						<Label>Error Correction</Label>
						<Select.Root
							type="single"
							value={errorLevel}
							onValueChange={handleErrorLevelChange}
						>
							<Select.Trigger class="w-full">
								{ERROR_LEVELS.find((l) => l.value === errorLevel)?.label ?? errorLevel}
							</Select.Trigger>
							<Select.Content>
								{#each ERROR_LEVELS as level (level.value)}
									<Select.Item value={level.value}>
										{level.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label>Margin: {margin} modules</Label>
						<Slider type="single" bind:value={margin} min={0} max={10} step={1} />
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="qr-fg">Foreground Color</Label>
							<div class="flex items-center gap-2">
								<input
									id="qr-fg"
									type="color"
									bind:value={fgColor}
									class="size-9 cursor-pointer rounded border-0"
								/>
								<Input value={fgColor} oninput={(e) => (fgColor = (e.target as HTMLInputElement).value)} class="flex-1 font-mono text-xs" />
							</div>
						</div>
						<div class="space-y-2">
							<Label for="qr-bg">Background Color</Label>
							<div class="flex items-center gap-2">
								<input
									id="qr-bg"
									type="color"
									bind:value={bgColor}
									class="size-9 cursor-pointer rounded border-0"
								/>
								<Input value={bgColor} oninput={(e) => (bgColor = (e.target as HTMLInputElement).value)} class="flex-1 font-mono text-xs" />
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
	<CodePreview mode="canvas" canvasEl={canvasEl} {hasContent} filename="qrcode" onDownloadPng={exportQrPng}>
		<canvas bind:this={canvasEl} class="max-w-full"></canvas>
	</CodePreview>
</div>
