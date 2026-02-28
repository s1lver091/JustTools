<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import TextToAscii from '$lib/components/ascii/TextToAscii.svelte';
	import ImageToAscii from '$lib/components/ascii/ImageToAscii.svelte';
	import AsciiExport from '$lib/components/ascii/AsciiExport.svelte';

	let textOutput = $state('');
	let imageOutput = $state('');
	let activeTab = $state('text');

	const currentOutput = $derived(activeTab === 'text' ? textOutput : imageOutput);
</script>

<ToolHeader
	title="ASCII Art"
	description="Convert text to ASCII art with FIGlet fonts and images to character art"
/>

<Tabs.Root bind:value={activeTab}>
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<Tabs.List>
			<Tabs.Trigger value="text">Text to ASCII</Tabs.Trigger>
			<Tabs.Trigger value="image">Image to ASCII</Tabs.Trigger>
		</Tabs.List>
		<AsciiExport output={currentOutput} />
	</div>

	<Tabs.Content value="text">
		<TextToAscii bind:output={textOutput} />
	</Tabs.Content>

	<Tabs.Content value="image">
		<ImageToAscii bind:output={imageOutput} />
	</Tabs.Content>
</Tabs.Root>
