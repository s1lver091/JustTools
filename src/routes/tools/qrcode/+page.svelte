<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import QrGenerator from '$lib/components/qrcode/QrGenerator.svelte';
	import BarcodeGenerator from '$lib/components/qrcode/BarcodeGenerator.svelte';
	import BatchGenerator from '$lib/components/qrcode/BatchGenerator.svelte';
</script>

<ToolHeader
	title="QR & Barcode"
	description="Generate QR codes and barcodes for URLs, text, WiFi, contacts, and more"
/>

<Tabs.Root value="qr">
	<Tabs.List class="mb-6">
		<Tabs.Trigger value="qr">QR Code</Tabs.Trigger>
		<Tabs.Trigger value="barcode">Barcode</Tabs.Trigger>
		<Tabs.Trigger value="batch">Batch</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="qr">
		<QrGenerator />
	</Tabs.Content>

	<Tabs.Content value="barcode">
		<BarcodeGenerator />
	</Tabs.Content>

	<Tabs.Content value="batch">
		<BatchGenerator />
	</Tabs.Content>
</Tabs.Root>
