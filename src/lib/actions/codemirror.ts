import { EditorView, keymap } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab
} from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
	syntaxHighlighting,
	defaultHighlightStyle,
	bracketMatching,
	indentOnInput
} from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Action } from 'svelte/action';
import type { KeyBinding } from '@codemirror/view';

export interface CodemirrorParams {
	value: string;
	onChange: (value: string) => void;
	onReady?: (view: EditorView) => void;
	darkMode?: boolean;
	extraKeys?: KeyBinding[];
}

const lightTheme = EditorView.theme({
	'&': {
		height: '100%',
		fontSize: '14px'
	},
	'.cm-scroller': {
		overflow: 'auto',
		fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
	},
	'.cm-content': {
		padding: '16px 0'
	},
	'.cm-gutters': {
		backgroundColor: 'transparent',
		borderRight: '1px solid var(--border)',
		color: 'var(--muted-foreground)'
	},
	'.cm-activeLineGutter': {
		backgroundColor: 'transparent'
	},
	'&.cm-focused .cm-cursor': {
		borderLeftColor: 'var(--foreground)'
	},
	'&.cm-focused .cm-selectionBackground, ::selection': {
		backgroundColor: 'var(--accent)'
	},
	'.cm-activeLine': {
		backgroundColor: 'var(--accent)'
	}
});

const darkThemeExtension = EditorView.theme(
	{
		'&': {
			height: '100%',
			fontSize: '14px'
		},
		'.cm-scroller': {
			overflow: 'auto',
			fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
		},
		'.cm-content': {
			padding: '16px 0'
		}
	},
	{ dark: true }
);

export const codemirror: Action<HTMLDivElement, CodemirrorParams> = (node, params) => {
	if (!params) return;

	const themeConfig = new Compartment();
	let lastValue = params.value;
	let isUpdatingFromOutside = false;

	function getThemeExtension(dark: boolean) {
		if (dark) {
			return [darkThemeExtension, oneDark];
		}
		return [lightTheme, syntaxHighlighting(defaultHighlightStyle)];
	}

	const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
		if (update.docChanged && !isUpdatingFromOutside) {
			const newValue = update.state.doc.toString();
			lastValue = newValue;
			params.onChange(newValue);
		}
	});

	const state = EditorState.create({
		doc: params.value,
		extensions: [
			themeConfig.of(getThemeExtension(params.darkMode ?? false)),
			EditorView.lineWrapping,
			history(),
			bracketMatching(),
			indentOnInput(),
			highlightSelectionMatches(),
			markdown({ base: markdownLanguage, codeLanguages: languages }),
			keymap.of([
				...(params.extraKeys ?? []),
				...defaultKeymap,
				...historyKeymap,
				...searchKeymap,
				indentWithTab
			]),
			updateListener
		]
	});

	const view = new EditorView({ state, parent: node });

	params.onReady?.(view);

	return {
		update(newParams: CodemirrorParams) {
			params = newParams;

			// Update theme if darkMode changed
			view.dispatch({
				effects: themeConfig.reconfigure(getThemeExtension(newParams.darkMode ?? false))
			});

			// Update document if value changed externally
			if (newParams.value !== lastValue) {
				isUpdatingFromOutside = true;
				const currentSelection = view.state.selection;
				view.dispatch({
					changes: {
						from: 0,
						to: view.state.doc.length,
						insert: newParams.value
					},
					selection: {
						anchor: Math.min(currentSelection.main.anchor, newParams.value.length),
						head: Math.min(currentSelection.main.head, newParams.value.length)
					}
				});
				lastValue = newParams.value;
				isUpdatingFromOutside = false;
			}
		},
		destroy() {
			view.destroy();
		}
	};
};

export type { EditorView } from '@codemirror/view';
