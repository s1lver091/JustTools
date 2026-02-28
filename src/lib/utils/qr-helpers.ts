export type QrContentType =
	| 'text'
	| 'url'
	| 'wifi'
	| 'vcard'
	| 'email'
	| 'phone'
	| 'sms'
	| 'geo';

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiData {
	ssid: string;
	password: string;
	encryption: WifiEncryption;
	hidden: boolean;
}

export interface VCardData {
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	org: string;
	title: string;
	url: string;
}

export interface EmailData {
	address: string;
	subject: string;
	body: string;
}

export interface SmsData {
	number: string;
	message: string;
}

export interface GeoData {
	latitude: string;
	longitude: string;
}

function escapeWifi(value: string): string {
	return value.replace(/([\\;,:"'])/g, '\\$1');
}

export function formatWifi(data: WifiData): string {
	const parts = [
		`T:${data.encryption}`,
		`S:${escapeWifi(data.ssid)}`,
		data.encryption !== 'nopass' ? `P:${escapeWifi(data.password)}` : '',
		data.hidden ? 'H:true' : ''
	].filter(Boolean);
	return `WIFI:${parts.join(';')};;`;
}

export function formatVCard(data: VCardData): string {
	const lines = [
		'BEGIN:VCARD',
		'VERSION:3.0',
		`N:${data.lastName};${data.firstName};;;`,
		`FN:${data.firstName} ${data.lastName}`
	];
	if (data.phone) lines.push(`TEL;TYPE=CELL:${data.phone}`);
	if (data.email) lines.push(`EMAIL:${data.email}`);
	if (data.org) lines.push(`ORG:${data.org}`);
	if (data.title) lines.push(`TITLE:${data.title}`);
	if (data.url) lines.push(`URL:${data.url}`);
	lines.push('END:VCARD');
	return lines.join('\n');
}

export function formatEmail(data: EmailData): string {
	const params: string[] = [];
	if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
	if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
	const query = params.length > 0 ? `?${params.join('&')}` : '';
	return `mailto:${data.address}${query}`;
}

export function formatPhone(number: string): string {
	return `tel:${number}`;
}

export function formatSms(data: SmsData): string {
	if (data.message) {
		return `smsto:${data.number}:${data.message}`;
	}
	return `smsto:${data.number}`;
}

export function formatGeo(data: GeoData): string {
	return `geo:${data.latitude},${data.longitude}`;
}

export function formatQrContent(type: QrContentType, data: unknown): string {
	switch (type) {
		case 'wifi':
			return formatWifi(data as WifiData);
		case 'vcard':
			return formatVCard(data as VCardData);
		case 'email':
			return formatEmail(data as EmailData);
		case 'phone':
			return formatPhone(data as string);
		case 'sms':
			return formatSms(data as SmsData);
		case 'geo':
			return formatGeo(data as GeoData);
		case 'url':
		case 'text':
		default:
			return data as string;
	}
}

export const QR_CONTENT_TYPES: { value: QrContentType; label: string }[] = [
	{ value: 'text', label: 'Plain Text' },
	{ value: 'url', label: 'URL' },
	{ value: 'wifi', label: 'WiFi' },
	{ value: 'vcard', label: 'Contact (vCard)' },
	{ value: 'email', label: 'Email' },
	{ value: 'phone', label: 'Phone' },
	{ value: 'sms', label: 'SMS' },
	{ value: 'geo', label: 'Geo Location' }
];

export type BarcodeFormat =
	| 'CODE128'
	| 'CODE128A'
	| 'CODE128B'
	| 'CODE128C'
	| 'EAN13'
	| 'EAN8'
	| 'EAN5'
	| 'EAN2'
	| 'UPCA'
	| 'UPCE'
	| 'CODE39'
	| 'ITF14'
	| 'ITF'
	| 'MSI'
	| 'MSI10'
	| 'MSI11'
	| 'MSI1010'
	| 'MSI1110'
	| 'pharmacode'
	| 'codabar'
	| 'GenericBarcode';

export interface BarcodeFormatInfo {
	value: BarcodeFormat;
	label: string;
	description: string;
	placeholder: string;
	validate: (value: string) => string | null;
}

function isDigitsOnly(value: string): boolean {
	return /^\d+$/.test(value);
}

function calculateEAN13Check(digits: string): number {
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		const digit = parseInt(digits[i], 10);
		sum += i % 2 === 0 ? digit : digit * 3;
	}
	return (10 - (sum % 10)) % 10;
}

function calculateEAN8Check(digits: string): number {
	let sum = 0;
	for (let i = 0; i < 7; i++) {
		const digit = parseInt(digits[i], 10);
		sum += i % 2 === 0 ? digit * 3 : digit;
	}
	return (10 - (sum % 10)) % 10;
}

export const BARCODE_FORMATS: BarcodeFormatInfo[] = [
	{
		value: 'CODE128',
		label: 'Code 128 (Auto)',
		description: 'Most versatile, encodes all ASCII characters',
		placeholder: 'Any text, e.g. ABC-1234',
		validate: (v) => (v.length === 0 ? 'Enter text to encode' : null)
	},
	{
		value: 'CODE128A',
		label: 'Code 128A',
		description: 'Uppercase letters, digits, control characters',
		placeholder: 'UPPERCASE TEXT',
		validate: (v) => {
			if (v.length === 0) return 'Enter text to encode';
			if (!/^[\x00-\x5F]+$/.test(v)) return 'Only uppercase letters, digits, and control chars';
			return null;
		}
	},
	{
		value: 'CODE128B',
		label: 'Code 128B',
		description: 'All printable ASCII characters',
		placeholder: 'Any printable text',
		validate: (v) => {
			if (v.length === 0) return 'Enter text to encode';
			if (!/^[\x20-\x7F]+$/.test(v)) return 'Only printable ASCII characters allowed';
			return null;
		}
	},
	{
		value: 'CODE128C',
		label: 'Code 128C',
		description: 'Numeric-only, pairs of digits (even length)',
		placeholder: '123456',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits to encode';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length % 2 !== 0) return 'Must have an even number of digits';
			return null;
		}
	},
	{
		value: 'EAN13',
		label: 'EAN-13 (GTIN-13)',
		description: 'International product barcode, 13 digits (12 + check)',
		placeholder: '5901234123457',
		validate: (v) => {
			if (v.length === 0) return 'Enter 12 or 13 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length === 12) return null;
			if (v.length === 13) {
				const check = calculateEAN13Check(v);
				if (parseInt(v[12], 10) !== check) return `Invalid check digit (expected ${check})`;
				return null;
			}
			return 'Must be 12 digits (auto check) or 13 digits';
		}
	},
	{
		value: 'EAN8',
		label: 'EAN-8 (GTIN-8)',
		description: 'Compact product barcode, 8 digits (7 + check)',
		placeholder: '96385074',
		validate: (v) => {
			if (v.length === 0) return 'Enter 7 or 8 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length === 7) return null;
			if (v.length === 8) {
				const check = calculateEAN8Check(v);
				if (parseInt(v[7], 10) !== check) return `Invalid check digit (expected ${check})`;
				return null;
			}
			return 'Must be 7 digits (auto check) or 8 digits';
		}
	},
	{
		value: 'EAN5',
		label: 'EAN-5',
		description: '5-digit supplement barcode (used with books)',
		placeholder: '52495',
		validate: (v) => {
			if (v.length === 0) return 'Enter 5 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length !== 5) return 'Must be exactly 5 digits';
			return null;
		}
	},
	{
		value: 'EAN2',
		label: 'EAN-2',
		description: '2-digit supplement barcode (magazine issue numbers)',
		placeholder: '05',
		validate: (v) => {
			if (v.length === 0) return 'Enter 2 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length !== 2) return 'Must be exactly 2 digits';
			return null;
		}
	},
	{
		value: 'UPCA',
		label: 'UPC-A (GTIN-12)',
		description: 'US/Canada product barcode, 12 digits (11 + check)',
		placeholder: '036000291452',
		validate: (v) => {
			if (v.length === 0) return 'Enter 11 or 12 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length === 11 || v.length === 12) return null;
			return 'Must be 11 digits (auto check) or 12 digits';
		}
	},
	{
		value: 'UPCE',
		label: 'UPC-E',
		description: 'Compact US product barcode, 6-8 digits',
		placeholder: '01234565',
		validate: (v) => {
			if (v.length === 0) return 'Enter 6-8 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length < 6 || v.length > 8) return 'Must be 6-8 digits';
			return null;
		}
	},
	{
		value: 'CODE39',
		label: 'Code 39',
		description: 'Alphanumeric, used in automotive and defense',
		placeholder: 'CODE-39',
		validate: (v) => {
			if (v.length === 0) return 'Enter text to encode';
			if (!/^[A-Z0-9\-. $/+%]+$/i.test(v))
				return 'Only letters, digits, and - . $ / + % space';
			return null;
		}
	},
	{
		value: 'ITF14',
		label: 'ITF-14 (GTIN-14)',
		description: 'Shipping/packaging barcode, 14 digits',
		placeholder: '15400141288763',
		validate: (v) => {
			if (v.length === 0) return 'Enter 14 digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length !== 14) return 'Must be exactly 14 digits';
			return null;
		}
	},
	{
		value: 'ITF',
		label: 'ITF (Interleaved 2 of 5)',
		description: 'Numeric pairs, even digit count',
		placeholder: '1234567890',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits to encode';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			if (v.length % 2 !== 0) return 'Must have an even number of digits';
			return null;
		}
	},
	{
		value: 'MSI',
		label: 'MSI',
		description: 'Numeric barcode used for inventory',
		placeholder: '1234567',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			return null;
		}
	},
	{
		value: 'MSI10',
		label: 'MSI (Mod 10)',
		description: 'MSI with Mod 10 check digit',
		placeholder: '1234567',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			return null;
		}
	},
	{
		value: 'MSI11',
		label: 'MSI (Mod 11)',
		description: 'MSI with Mod 11 check digit',
		placeholder: '1234567',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			return null;
		}
	},
	{
		value: 'MSI1010',
		label: 'MSI (Mod 10/10)',
		description: 'MSI with double Mod 10 check',
		placeholder: '1234567',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			return null;
		}
	},
	{
		value: 'MSI1110',
		label: 'MSI (Mod 11/10)',
		description: 'MSI with Mod 11 then Mod 10 check',
		placeholder: '1234567',
		validate: (v) => {
			if (v.length === 0) return 'Enter digits';
			if (!isDigitsOnly(v)) return 'Only digits allowed';
			return null;
		}
	},
	{
		value: 'pharmacode',
		label: 'Pharmacode',
		description: 'Pharmaceutical industry, numeric 3-131070',
		placeholder: '1234',
		validate: (v) => {
			if (v.length === 0) return 'Enter a number (3-131070)';
			const num = parseInt(v, 10);
			if (isNaN(num) || num < 3 || num > 131070) return 'Must be a number between 3 and 131070';
			return null;
		}
	},
	{
		value: 'codabar',
		label: 'Codabar',
		description: 'Used in libraries, blood banks, shipping',
		placeholder: 'A12345B',
		validate: (v) => {
			if (v.length === 0) return 'Enter text to encode';
			if (!/^[A-Da-d][0-9\-$:/.+]+[A-Da-d]$/.test(v))
				return 'Must start/end with A-D and contain digits or - $ : / . +';
			return null;
		}
	},
	{
		value: 'GenericBarcode',
		label: 'Generic Barcode',
		description: 'Plain text below bars (display only)',
		placeholder: 'Any text',
		validate: (v) => (v.length === 0 ? 'Enter text to display' : null)
	}
];

export const BARCODE_FORMAT_GROUPS: { label: string; formats: BarcodeFormat[] }[] = [
	{
		label: 'Universal',
		formats: ['CODE128', 'CODE128A', 'CODE128B', 'CODE128C']
	},
	{
		label: 'Product (EAN/UPC/GTIN)',
		formats: ['EAN13', 'EAN8', 'EAN5', 'EAN2', 'UPCA', 'UPCE']
	},
	{
		label: 'Shipping',
		formats: ['ITF14', 'ITF']
	},
	{
		label: 'Industry',
		formats: ['CODE39', 'MSI', 'MSI10', 'MSI11', 'MSI1010', 'MSI1110', 'pharmacode', 'codabar']
	},
	{
		label: 'Other',
		formats: ['GenericBarcode']
	}
];
