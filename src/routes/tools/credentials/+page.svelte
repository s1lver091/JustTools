<script lang="ts">
	import ToolHeader from '$lib/components/shared/ToolHeader.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import PasswordGenerator from '$lib/components/credentials/PasswordGenerator.svelte';
	import PassphraseGenerator from '$lib/components/credentials/PassphraseGenerator.svelte';
	import StrengthChecker from '$lib/components/credentials/StrengthChecker.svelte';
	import UsernameGenerator from '$lib/components/credentials/UsernameGenerator.svelte';
	import BulkGenerator from '$lib/components/credentials/BulkGenerator.svelte';
</script>

<ToolHeader
	title="Password & Username"
	description="Generate secure passwords, passphrases, and usernames with strength analysis"
/>

<Tabs.Root value="password">
	<Tabs.List class="mb-6">
		<Tabs.Trigger value="password">Password</Tabs.Trigger>
		<Tabs.Trigger value="passphrase">Passphrase</Tabs.Trigger>
		<Tabs.Trigger value="strength">Strength</Tabs.Trigger>
		<Tabs.Trigger value="username">Username</Tabs.Trigger>
		<Tabs.Trigger value="bulk">Bulk</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="password">
		<PasswordGenerator />
	</Tabs.Content>

	<Tabs.Content value="passphrase">
		<PassphraseGenerator />
	</Tabs.Content>

	<Tabs.Content value="strength">
		<StrengthChecker />
	</Tabs.Content>

	<Tabs.Content value="username">
		<UsernameGenerator />
	</Tabs.Content>

	<Tabs.Content value="bulk">
		<BulkGenerator />
	</Tabs.Content>
</Tabs.Root>
