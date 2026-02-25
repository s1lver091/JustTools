export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);
	return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
	if (bytesPerSecond === 0) return '0 B/s';
	return `${formatFileSize(bytesPerSecond)}/s`;
}

export function formatEta(seconds: number): string {
	if (seconds <= 0 || !isFinite(seconds)) return '';
	if (seconds < 60) return `~${Math.ceil(seconds)}s remaining`;
	const minutes = Math.floor(seconds / 60);
	const secs = Math.ceil(seconds % 60);
	if (minutes < 60) return `~${minutes}m ${secs}s remaining`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `~${hours}h ${mins}m remaining`;
}
