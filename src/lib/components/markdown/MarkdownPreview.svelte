<script lang="ts">
	interface Props {
		html: string;
		onToggleCheckbox?: (index: number) => void;
	}

	let { html, onToggleCheckbox }: Props = $props();
	let previewRef = $state<HTMLDivElement | null>(null);

	// Remove 'disabled' attribute from checkboxes rendered by marked/GFM
	// so they can be clicked and we can handle the toggle manually.
	$effect(() => {
		if (previewRef && html) {
			const checkboxes = previewRef.querySelectorAll('input[type="checkbox"]');
			checkboxes.forEach((cb) => {
				cb.removeAttribute('disabled');
			});
		}
	});

	function handleClick(e: MouseEvent) {
		if (!onToggleCheckbox) return;
		const target = e.target as HTMLElement;
		
		// Handle click on checkbox directly
		if (target instanceof HTMLInputElement && target.type === 'checkbox') {
			e.preventDefault();
			const checkboxes = previewRef?.querySelectorAll('input[type="checkbox"]');
			if (!checkboxes) return;
			const index = Array.from(checkboxes).indexOf(target);
			if (index >= 0) {
				onToggleCheckbox(index);
			}
		}
	}
</script>

<div class="preview" bind:this={previewRef} onclick={handleClick} role="presentation">
	{@html html}
</div>

<style>
	.preview {
		color: var(--foreground);
		line-height: 1.625;
	}

	.preview :global(h1) {
		font-size: 1.875rem;
		line-height: 2.25rem;
		font-weight: 700;
		letter-spacing: -0.025em;
		margin-top: 1.5rem;
		margin-bottom: 1rem;
	}

	.preview :global(h1:first-child) {
		margin-top: 0;
	}

	.preview :global(h2) {
		font-size: 1.5rem;
		line-height: 2rem;
		font-weight: 600;
		letter-spacing: -0.025em;
		margin-top: 1.25rem;
		margin-bottom: 0.75rem;
	}

	.preview :global(h2:first-child) {
		margin-top: 0;
	}

	.preview :global(h3) {
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	.preview :global(h3:first-child) {
		margin-top: 0;
	}

	.preview :global(h4) {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	.preview :global(h5) {
		font-size: 1rem;
		line-height: 1.5rem;
		font-weight: 600;
		margin-top: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.preview :global(h6) {
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 600;
		color: var(--muted-foreground);
		margin-top: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.preview :global(p) {
		margin-bottom: 1rem;
		line-height: 1.75;
	}

	.preview :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.preview :global(a:hover) {
		opacity: 0.8;
	}

	.preview :global(strong) {
		font-weight: 600;
	}

	.preview :global(em) {
		font-style: italic;
	}

	.preview :global(del) {
		text-decoration: line-through;
		color: var(--muted-foreground);
	}

	.preview :global(blockquote) {
		border-left: 4px solid oklch(from var(--primary) l c h / 0.3);
		color: var(--muted-foreground);
		margin: 1rem 0;
		padding-left: 1rem;
		font-style: italic;
	}

	.preview :global(ul) {
		margin: 1rem 0;
		margin-left: 1.5rem;
		list-style-type: disc;
	}

	.preview :global(ol) {
		margin: 1rem 0;
		margin-left: 1.5rem;
		list-style-type: decimal;
	}

	.preview :global(li) {
		margin-bottom: 0.25rem;
		line-height: 1.75;
	}

	.preview :global(li > ul),
	.preview :global(li > ol) {
		margin: 0.25rem 0;
	}

	.preview :global(code) {
		background-color: var(--muted);
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.875rem;
	}

	.preview :global(pre) {
		background-color: var(--muted);
		margin: 1rem 0;
		overflow-x: auto;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.preview :global(pre code) {
		background-color: transparent;
		padding: 0;
		border-radius: 0;
	}

	.preview :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 1.5rem 0;
	}

	.preview :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	.preview :global(th) {
		background-color: var(--muted);
		border: 1px solid var(--border);
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-weight: 600;
	}

	.preview :global(td) {
		border: 1px solid var(--border);
		padding: 0.5rem 0.75rem;
	}

	.preview :global(tr:nth-child(even)) {
		background-color: oklch(from var(--muted) l c h / 0.5);
	}

	.preview :global(img) {
		max-width: 100%;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}

	.preview :global(input[type='checkbox']) {
		margin-right: 0.5rem;
		cursor: pointer;
	}

	/* highlight.js theme - adapts to light/dark via CSS variables */
	.preview :global(.hljs) {
		color: var(--foreground);
	}

	.preview :global(.hljs-keyword),
	.preview :global(.hljs-selector-tag),
	.preview :global(.hljs-built_in),
	.preview :global(.hljs-name),
	.preview :global(.hljs-tag) {
		color: oklch(0.55 0.25 270);
	}

	.preview :global(.hljs-string),
	.preview :global(.hljs-title),
	.preview :global(.hljs-section),
	.preview :global(.hljs-attribute),
	.preview :global(.hljs-literal),
	.preview :global(.hljs-template-tag),
	.preview :global(.hljs-template-variable),
	.preview :global(.hljs-type),
	.preview :global(.hljs-addition) {
		color: oklch(0.55 0.2 145);
	}

	.preview :global(.hljs-comment),
	.preview :global(.hljs-quote),
	.preview :global(.hljs-deletion),
	.preview :global(.hljs-meta) {
		color: var(--muted-foreground);
	}

	.preview :global(.hljs-number),
	.preview :global(.hljs-regexp),
	.preview :global(.hljs-variable),
	.preview :global(.hljs-link) {
		color: oklch(0.6 0.2 40);
	}

	.preview :global(.hljs-symbol),
	.preview :global(.hljs-bullet) {
		color: oklch(0.55 0.2 300);
	}

	.preview :global(.hljs-emphasis) {
		font-style: italic;
	}

	.preview :global(.hljs-strong) {
		font-weight: bold;
	}
</style>
