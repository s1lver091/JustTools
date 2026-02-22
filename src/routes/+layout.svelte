<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Separator } from '$lib/components/ui/separator';
	import { theme } from '$lib/stores/theme.svelte';
	import { Sun, Moon, Menu, PanelLeftClose, PanelLeft, Wrench, Sparkles } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { tools } from '$lib/tools';
	import ToolSearch from '$lib/components/shared/ToolSearch.svelte';
	import './layout.css';

	let { children }: { children: Snippet } = $props();

	// navItems is derived directly from the tools registry
	type Resolvable = Parameters<typeof resolve>[0];
	const navItems = tools.map((t) => ({
		name: t.name,
		href: t.href as Resolvable,
		icon: t.icon
	}));

	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);

	// Sidebar is only visible when navigated inside a tool
	const inTools = $derived(page.url.pathname.startsWith('/tools'));

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function toggleTheme() {
		theme.toggle();
	}
</script>

<svelte:head>
	<title>JustTools</title>
	<meta name="description" content="Lightweight browser-based productivity tools" />
</svelte:head>

<Tooltip.Provider>

<!-- Header -->
<header
	class="bg-background/80 border-border fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b backdrop-blur-md"
>
	<!-- Mobile menu button, only visible inside tools -->
	{#if inTools}
		<Button
			variant="ghost"
			size="icon"
			class="ml-3 md:hidden"
			onclick={() => (mobileMenuOpen = true)}
			aria-label="Open menu"
		>
			<Menu class="size-5" />
		</Button>
	{/if}

	<!-- Logo -->
	<a href={resolve('/')} class="flex items-center gap-2 px-4">
		<Wrench class="text-primary size-5" />
		<span class="text-lg font-semibold tracking-tight">JustTools</span>
	</a>

	<div class="flex flex-1 justify-center px-4">
		<ToolSearch />
	</div>

	<!-- Theme toggle -->
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="icon"
					class="mr-3"
					{...props}
					onclick={toggleTheme}
					aria-label="Toggle theme"
				>
					{#if theme.isDark}
						<Sun class="size-5" />
					{:else}
						<Moon class="size-5" />
					{/if}
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>{theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</header>

{#if inTools}

<!-- Desktop Sidebar -->
<aside
	class="bg-sidebar border-sidebar-border fixed top-14 bottom-0 left-0 z-40 hidden border-r transition-all duration-200 md:block"
	class:w-60={!sidebarCollapsed}
	class:w-16={sidebarCollapsed}
>
	<nav class="flex h-full flex-col" aria-label="Main navigation">
		<div class="flex-1 space-y-1 p-2">
			{#each navItems as item (item.href)}
				{@const NavIcon = item.icon}
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<a
								href={resolve(item.href)}
								class="hover:bg-sidebar-accent flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(
									item.href
								)
									? 'bg-sidebar-accent text-sidebar-accent-foreground'
									: 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}"
								class:justify-center={sidebarCollapsed}
								{...props}
							>
								<NavIcon class="size-5 shrink-0" />
								{#if !sidebarCollapsed}
									<span>{item.name}</span>
								{/if}
							</a>
						{/snippet}
					</Tooltip.Trigger>
					{#if sidebarCollapsed}
						<Tooltip.Content side="right">
							<p>{item.name}</p>
						</Tooltip.Content>
					{/if}
				</Tooltip.Root>
			{/each}

			<!-- Coming soon indicator -->
			<div
				class="text-sidebar-foreground/35 flex items-center gap-3 px-3 py-2 text-sm select-none"
				class:justify-center={sidebarCollapsed}
			>
				<Sparkles class="size-5 shrink-0" />
				{#if !sidebarCollapsed}
					<span class="italic">More coming soon…</span>
				{/if}
			</div>
		</div>

		<Separator />

		<div class="p-2">
			<Button
				variant="ghost"
				size="sm"
				class="w-full {sidebarCollapsed ? 'justify-center' : 'justify-start'}"
				onclick={toggleSidebar}
				aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				{#if sidebarCollapsed}
					<PanelLeft class="size-4" />
				{:else}
					<PanelLeftClose class="size-4" />
					<span class="ml-2">Collapse</span>
				{/if}
			</Button>
		</div>
	</nav>
</aside>

{/if}

{#if inTools}

<!-- Mobile Sidebar (Sheet) -->
<Sheet.Root bind:open={mobileMenuOpen}>
	<Sheet.Content side="left" class="w-72 p-0">
		<Sheet.Header class="border-border border-b px-4 py-3">
			<Sheet.Title class="flex items-center gap-2">
				<Wrench class="text-primary size-5" />
				JustTools
			</Sheet.Title>
		</Sheet.Header>
		<nav class="p-2" aria-label="Mobile navigation">
			{#each navItems as item (item.href)}
				{@const NavIcon = item.icon}
				<a
					href={resolve(item.href)}
					class="hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(
						item.href
					)
						? 'bg-accent text-accent-foreground'
						: 'text-foreground/70 hover:text-foreground'}"
					onclick={() => (mobileMenuOpen = false)}
				>
					<NavIcon class="size-5" />
					<span>{item.name}</span>
				</a>
			{/each}

			<!-- Coming soon indicator -->
			<div class="text-foreground/35 flex items-center gap-3 px-3 py-2 text-sm select-none">
				<Sparkles class="size-5" />
				<span class="italic">More coming soon…</span>
			</div>
		</nav>
	</Sheet.Content>
</Sheet.Root>

{/if}

<!-- Main content -->
<main
	class="min-h-screen pt-14 transition-all duration-200"
	class:md:pl-60={!sidebarCollapsed && inTools}
	class:md:pl-16={sidebarCollapsed && inTools}
>
	<div class="p-6">
		{@render children()}
	</div>
</main>

</Tooltip.Provider>
