<script lang="ts">
	interface Props {
		icon: string;
		label: string;
		selected: boolean;
		onclick: () => void;
	}

	let { icon, label, selected, onclick }: Props = $props();
</script>

<button
	class="trigger-chip"
	class:selected
	{onclick}
	type="button"
	aria-pressed={selected}
>
	<span class="chip-icon">{icon}</span>
	<span class="chip-label">{label}</span>
</button>

<style>
	.trigger-chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--neutral-50, #f8fafc);
		border: 1.5px solid var(--neutral-200);
		border-radius: var(--radius-lg, 12px);
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--neutral-700);
		white-space: nowrap;
	}

	.trigger-chip:hover {
		border-color: var(--primary-300, #00cc96);
		background: var(--primary-50, rgba(0, 204, 150, 0.04));
		transform: translateY(-1px);
	}

	.trigger-chip.selected {
		border-color: var(--primary-500, #00cc96);
		background: rgba(0, 204, 150, 0.08);
		color: var(--primary-700, #00cc96);
		box-shadow: 0 0 0 3px rgba(0, 204, 150, 0.12);
	}

	.chip-icon {
		font-size: 1.125rem;
		line-height: 1;
	}

	.chip-label {
		line-height: 1;
	}
</style>
