<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Home, AlertTriangle, RefreshCw } from '@lucide/svelte';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'An unexpected error occurred.');

	const statusMessages: Record<number, string> = {
		404: 'Page not found',
		403: 'Access denied',
		500: 'Internal server error',
		503: 'Service unavailable'
	};

	const title = $derived(statusMessages[status] ?? 'Something went wrong');
</script>

<svelte:head>
	<title>{status} | {title} | JustTools</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 text-center">
	<!-- Error code badge -->
	<div
		class="bg-destructive/10 text-destructive mb-6 flex size-20 items-center justify-center rounded-full"
	>
		<AlertTriangle class="size-10" />
	</div>

	<!-- Status code -->
	<p class="text-muted-foreground mb-2 text-sm font-semibold uppercase tracking-widest">
		Error {status}
	</p>

	<!-- Title -->
	<h1 class="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
		{title}
	</h1>

	<!-- Message -->
	<p class="text-muted-foreground mb-8 max-w-md text-base">
		{message}
	</p>

	<!-- Actions -->
	<div class="flex flex-wrap justify-center gap-3">
		<Button href={resolve('/')} variant="default">
			<Home class="mr-2 size-4" />
			Back to home
		</Button>
		<Button variant="outline" onclick={() => history.back()}>
			<RefreshCw class="mr-2 size-4" />
			Go back
		</Button>
	</div>
</div>
