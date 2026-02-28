<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { fromBase64Url } from '$lib/utils/encoding';

	let token = $state('');

	type JwtParts = {
		header: Record<string, unknown>;
		payload: Record<string, unknown>;
		signature: string;
		isValid: boolean;
		error?: string;
	};

	function decodeJwt(input: string): JwtParts {
		const trimmed = input.trim();
		if (!trimmed) {
			return { header: {}, payload: {}, signature: '', isValid: false, error: 'No token provided' };
		}

		const parts = trimmed.split('.');
		if (parts.length !== 3) {
			return { header: {}, payload: {}, signature: '', isValid: false, error: `Expected 3 parts separated by dots, got ${parts.length}` };
		}

		try {
			const header = JSON.parse(fromBase64Url(parts[0])) as Record<string, unknown>;
			const payload = JSON.parse(fromBase64Url(parts[1])) as Record<string, unknown>;
			return { header, payload, signature: parts[2], isValid: true };
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to decode token';
			return { header: {}, payload: {}, signature: '', isValid: false, error: msg };
		}
	}

	const result = $derived(decodeJwt(token));

	const expiryStatus = $derived.by(() => {
		if (!result.isValid) return null;
		const exp = result.payload.exp;
		if (typeof exp !== 'number') return { status: 'none' as const, label: 'No expiry' };

		const now = Date.now() / 1000;
		if (exp < now) {
			return { status: 'expired' as const, label: 'Expired' };
		}

		const remaining = exp - now;
		const hours = Math.floor(remaining / 3600);
		const minutes = Math.floor((remaining % 3600) / 60);
		const timeStr = hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`;
		return { status: 'valid' as const, label: `Valid (${timeStr})` };
	});

	function formatTimestamp(ts: unknown): string {
		if (typeof ts !== 'number') return 'Not specified';
		return new Date(ts * 1000).toLocaleString();
	}

	function formatClaimValue(value: unknown): string {
		if (value === undefined || value === null) return 'Not specified';
		return String(value);
	}
</script>

<ToolHeader title="JWT Inspector" description="Decode and inspect JWT tokens without verification" />

<div class="space-y-4">
	<!-- Token input -->
	<div class="space-y-2">
		<Label for="jwt-input">JWT Token</Label>
		<textarea
			id="jwt-input"
			bind:value={token}
			placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjg..."
			rows="4"
			class="border-input bg-background focus:ring-ring w-full rounded-lg border p-3 font-mono text-xs focus:ring-2 focus:outline-none"
		></textarea>
	</div>

	{#if !token.trim()}
		<p class="text-muted-foreground py-8 text-center text-sm">
			Paste a JWT token above to decode and inspect it
		</p>
	{:else if result.error && !result.isValid}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
			<p class="text-sm font-medium text-red-700 dark:text-red-400">Invalid JWT: {result.error}</p>
		</div>
	{:else if result.isValid}
		<!-- Token metadata -->
		<div class="flex flex-wrap items-center gap-2">
			{#if result.header.alg}
				<Badge variant="secondary">{result.header.alg}</Badge>
			{/if}
			{#if expiryStatus}
				{#if expiryStatus.status === 'expired'}
					<Badge variant="destructive">{expiryStatus.label}</Badge>
				{:else if expiryStatus.status === 'valid'}
					<Badge class="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">{expiryStatus.label}</Badge>
				{:else}
					<Badge variant="outline">{expiryStatus.label}</Badge>
				{/if}
			{/if}
		</div>

		<!-- Claims summary -->
		<div class="border-border grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
			<div>
				<p class="text-muted-foreground text-xs font-medium">Algorithm</p>
				<p class="font-mono text-sm">{formatClaimValue(result.header.alg)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs font-medium">Type</p>
				<p class="font-mono text-sm">{formatClaimValue(result.header.typ)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs font-medium">Subject</p>
				<p class="font-mono text-sm">{formatClaimValue(result.payload.sub)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs font-medium">Issuer</p>
				<p class="font-mono text-sm">{formatClaimValue(result.payload.iss)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs font-medium">Issued At</p>
				<p class="font-mono text-sm">{formatTimestamp(result.payload.iat)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs font-medium">Expires</p>
				<p class="font-mono text-sm">{formatTimestamp(result.payload.exp)}</p>
			</div>
			{#if result.payload.nbf !== undefined}
				<div>
					<p class="text-muted-foreground text-xs font-medium">Not Before</p>
					<p class="font-mono text-sm">{formatTimestamp(result.payload.nbf)}</p>
				</div>
			{/if}
		</div>

		<!-- Header card -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">Header</Card.Title>
			</Card.Header>
			<Card.Content>
				<pre class="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs">{JSON.stringify(result.header, null, 2)}</pre>
			</Card.Content>
		</Card.Root>

		<!-- Payload card -->
		<Card.Root class={expiryStatus?.status === 'expired' ? 'border-red-500/30' : ''}>
			<Card.Header>
				<Card.Title class="text-sm">Payload</Card.Title>
			</Card.Header>
			<Card.Content>
				<pre class="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs">{JSON.stringify(result.payload, null, 2)}</pre>
			</Card.Content>
		</Card.Root>

		<!-- Signature section -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">Signature</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<code class="bg-muted block overflow-x-auto rounded-lg p-4 font-mono text-xs break-all">
					{result.signature}
				</code>
				<p class="text-muted-foreground text-xs">
					Signature verification requires the secret key and is not performed
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
