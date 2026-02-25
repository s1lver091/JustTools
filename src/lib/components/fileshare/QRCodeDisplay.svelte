<script lang="ts">
	import type { Action } from 'svelte/action';

	let { data }: { data: string } = $props();

	const qrCanvas: Action<HTMLCanvasElement, string> = (canvas, value) => {
		renderQR(canvas, value);
		return {
			update(newValue: string) {
				renderQR(canvas, newValue);
			}
		};
	};

	async function renderQR(canvas: HTMLCanvasElement, value: string) {
		if (!value) return;
		const QRCode = (await import('qrcode')).default;
		await QRCode.toCanvas(canvas, value, {
			width: 256,
			margin: 2,
			errorCorrectionLevel: 'M',
			color: {
				dark: '#000000',
				light: '#ffffff'
			}
		});
	}
</script>

<div class="inline-block overflow-hidden rounded-lg border bg-white p-2">
	<canvas use:qrCanvas={data} class="block"></canvas>
</div>
