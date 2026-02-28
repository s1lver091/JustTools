type DiffLineType = 'added' | 'removed' | 'unchanged';

export type DiffLine = {
	type: DiffLineType;
	text: string;
	lineNumberOld?: number;
	lineNumberNew?: number;
};

export type DiffStats = {
	added: number;
	removed: number;
	unchanged: number;
};

export type DiffResult = {
	lines: DiffLine[];
	stats: DiffStats;
};

export function computeDiff(oldText: string, newText: string): DiffResult {
	const oldLines = oldText.split('\n');
	const newLines = newText.split('\n');
	const oldLen = oldLines.length;
	const newLen = newLines.length;

	// Build LCS table
	const lcs: number[][] = Array.from({ length: oldLen + 1 }, () =>
		new Array(newLen + 1).fill(0)
	);

	for (let i = 1; i <= oldLen; i++) {
		for (let j = 1; j <= newLen; j++) {
			if (oldLines[i - 1] === newLines[j - 1]) {
				lcs[i][j] = lcs[i - 1][j - 1] + 1;
			} else {
				lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
			}
		}
	}

	// Backtrack to produce diff lines
	const lines: DiffLine[] = [];
	let i = oldLen;
	let j = newLen;

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
			lines.push({
				type: 'unchanged',
				text: oldLines[i - 1],
				lineNumberOld: i,
				lineNumberNew: j
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
			lines.push({
				type: 'added',
				text: newLines[j - 1],
				lineNumberNew: j
			});
			j--;
		} else {
			lines.push({
				type: 'removed',
				text: oldLines[i - 1],
				lineNumberOld: i
			});
			i--;
		}
	}

	lines.reverse();

	const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 };
	for (const line of lines) {
		stats[line.type]++;
	}

	return { lines, stats };
}
