const YAML_SPECIAL = /[:#{}[\],&*?|<>=!%@`'"]/;
const YAML_BOOL = /^(true|false|yes|no|on|off)$/i;
const YAML_NULL = /^(null|~)$/i;
const YAML_NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

function needsQuoting(str: string): boolean {
	if (str === '') return true;
	if (YAML_SPECIAL.test(str)) return true;
	if (YAML_BOOL.test(str)) return true;
	if (YAML_NULL.test(str)) return true;
	if (YAML_NUMBER.test(str)) return true;
	if (str.startsWith(' ') || str.endsWith(' ')) return true;
	return false;
}

function escapeString(str: string): string {
	return '"' + str
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t') + '"';
}

function serializeValue(value: unknown, indent: number): string {
	if (value === null || value === undefined) return 'null';
	if (typeof value === 'boolean') return String(value);
	if (typeof value === 'number') return String(value);
	if (typeof value === 'string') {
		return needsQuoting(value) ? escapeString(value) : value;
	}

	const prefix = '  '.repeat(indent);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const lines: string[] = [];
		for (const item of value) {
			if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
				const entries = Object.entries(item);
				if (entries.length > 0) {
					const [firstKey, firstVal] = entries[0];
					lines.push(`${prefix}- ${firstKey}: ${serializeValue(firstVal, indent + 2)}`);
					for (let i = 1; i < entries.length; i++) {
						lines.push(`${prefix}  ${entries[i][0]}: ${serializeValue(entries[i][1], indent + 2)}`);
					}
				} else {
					lines.push(`${prefix}- {}`);
				}
			} else if (Array.isArray(item)) {
				lines.push(`${prefix}- `);
				lines.push(serializeValue(item, indent + 1).trimStart());
			} else {
				lines.push(`${prefix}- ${serializeValue(item, indent + 1)}`);
			}
		}
		return '\n' + lines.join('\n');
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		const lines: string[] = [];
		for (const [key, val] of entries) {
			const safeKey = needsQuoting(key) ? escapeString(key) : key;
			const serialized = serializeValue(val, indent + 1);
			if (typeof val === 'object' && val !== null && serialized.startsWith('\n')) {
				lines.push(`${prefix}${safeKey}:${serialized}`);
			} else {
				lines.push(`${prefix}${safeKey}: ${serialized}`);
			}
		}
		return '\n' + lines.join('\n');
	}

	return String(value);
}

export function jsonToYaml(value: unknown): string {
	const result = serializeValue(value, 0);
	return result.startsWith('\n') ? result.slice(1) : result;
}
