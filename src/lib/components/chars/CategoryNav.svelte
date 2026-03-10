<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';

	interface Props {
		categories: string[];
		selected: string;
		onSelect: (category: string) => void;
	}

	let { categories, selected, onSelect }: Props = $props();
</script>

<div class="overflow-x-auto">
	<Tabs.Root value={selected} onValueChange={(v) => v && onSelect(v)}>
		<Tabs.List class="inline-flex h-9 w-max min-w-full">
			<Tabs.Trigger value="All">All</Tabs.Trigger>
			{#each categories as category (category)}
				<Tabs.Trigger value={category}>{category}</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>
</div>
