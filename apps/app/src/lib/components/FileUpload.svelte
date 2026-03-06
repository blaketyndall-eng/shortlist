<script lang="ts">
	import Button from '$components/ui/Button.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	interface UploadedFile {
		name: string;
		path: string;
		size: number;
		type: string;
		url: string;
	}

	let {
		projectId,
		bucket = 'project-files',
		accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg',
		maxSizeMb = 10,
		files = $bindable<UploadedFile[]>([]),
		onupload
	}: {
		projectId: string;
		bucket?: string;
		accept?: string;
		maxSizeMb?: number;
		files?: UploadedFile[];
		onupload?: (file: UploadedFile) => void;
	} = $props();

	const supabase = createSupabaseBrowserClient();

	let uploading = $state(false);
	let dragOver = $state(false);
	let errorMsg = $state('');

	async function uploadFile(file: File) {
		if (file.size > maxSizeMb * 1024 * 1024) {
			errorMsg = `File too large. Maximum size is ${maxSizeMb}MB.`;
			return;
		}

		uploading = true;
		errorMsg = '';

		const ext = file.name.split('.').pop();
		const path = `${projectId}/${Date.now()}-${file.name}`;

		const { error } = await supabase.storage.from(bucket).upload(path, file, {
			cacheControl: '3600',
			upsert: false
		});

		if (error) {
			errorMsg = `Upload failed: ${error.message}`;
			uploading = false;
			return;
		}

		const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

		const uploaded: UploadedFile = {
			name: file.name,
			path,
			size: file.size,
			type: file.type,
			url: urlData.publicUrl
		};

		files = [...files, uploaded];
		onupload?.(uploaded);
		uploading = false;
	}

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			for (const file of Array.from(input.files)) {
				uploadFile(file);
			}
			input.value = '';
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) {
			for (const file of Array.from(e.dataTransfer.files)) {
				uploadFile(file);
			}
		}
	}

	async function removeFile(idx: number) {
		const file = files[idx];
		await supabase.storage.from(bucket).remove([file.path]);
		files = files.filter((_, i) => i !== idx);
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	const fileIcon: Record<string, string> = {
		'application/pdf': '📄',
		'text/csv': '📊',
		'image/png': '🖼️',
		'image/jpeg': '🖼️'
	};
</script>

<div class="upload-zone">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="dropzone"
		class:drag-over={dragOver}
		ondragover={(e) => { e.preventDefault(); dragOver = true; }}
		ondragleave={() => (dragOver = false)}
		ondrop={handleDrop}
	>
		<input type="file" {accept} multiple onchange={handleInput} id="file-upload" class="sr-only" />
		<label for="file-upload" class="dropzone-label">
			{#if uploading}
				<span class="upload-spinner"></span>
				<span>Uploading...</span>
			{:else}
				<span class="dropzone-icon">📎</span>
				<span>Drop files here or <strong>browse</strong></span>
				<span class="dropzone-hint">Max {maxSizeMb}MB per file</span>
			{/if}
		</label>
	</div>

	{#if errorMsg}
		<p class="error-msg">{errorMsg}</p>
	{/if}

	{#if files.length > 0}
		<ul class="file-list">
			{#each files as file, idx (file.path)}
				<li class="file-item">
					<span class="file-icon">{fileIcon[file.type] ?? '📄'}</span>
					<div class="file-info">
						<span class="file-name">{file.name}</span>
						<span class="file-size">{formatSize(file.size)}</span>
					</div>
					<button class="remove-btn" onclick={() => removeFile(idx)} title="Remove file">×</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.upload-zone { width: 100%; }

	.dropzone {
		border: 2px dashed var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		text-align: center;
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.dropzone:hover, .dropzone.drag-over {
		border-color: var(--primary-400);
		background: var(--primary-50);
	}

	.dropzone-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--neutral-500);
	}

	.dropzone-label strong {
		color: var(--primary-600);
	}

	.dropzone-icon { font-size: 1.5rem; }

	.dropzone-hint {
		font-size: 0.75rem;
		color: var(--neutral-400);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.upload-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--neutral-200);
		border-top-color: var(--primary-600);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.error-msg {
		color: var(--danger-600, #dc2626);
		font-size: 0.8125rem;
		margin-top: var(--space-2);
	}

	.file-list {
		list-style: none;
		padding: 0;
		margin: var(--space-3) 0 0;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--neutral-50);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-2);
	}

	.file-icon { font-size: 1rem; }

	.file-info { flex: 1; min-width: 0; }

	.file-name {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--neutral-700);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		font-size: 0.6875rem;
		color: var(--neutral-400);
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--neutral-400);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		line-height: 1;
	}

	.remove-btn:hover {
		color: var(--danger-600, #dc2626);
		background: var(--neutral-100);
	}
</style>
