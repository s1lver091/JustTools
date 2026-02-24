import { type AdjustmentState, DEFAULT_ADJUSTMENTS } from '$lib/utils/image-types';

interface ImageState {
	image: ImageBitmap;
	adjustments: AdjustmentState;
	label: string;
}

const MAX_HISTORY = 20;

export class ImageHistoryStore {
	past = $state.raw<ImageState[]>([]);
	present = $state.raw<ImageState | null>(null);
	future = $state.raw<ImageState[]>([]);

	get canUndo(): boolean {
		return this.past.length > 0;
	}

	get canRedo(): boolean {
		return this.future.length > 0;
	}

	get undoLabel(): string {
		if (this.past.length === 0) return '';
		return this.past[this.past.length - 1].label;
	}

	get redoLabel(): string {
		if (this.future.length === 0) return '';
		return this.future[this.future.length - 1].label;
	}

	init(image: ImageBitmap): void {
		this.cleanup();
		this.present = {
			image,
			adjustments: { ...DEFAULT_ADJUSTMENTS },
			label: 'Original'
		};
		this.past = [];
		this.future = [];
	}

	pushState(image: ImageBitmap, label: string, adjustments?: AdjustmentState): void {
		if (!this.present) return;

		// Close oldest bitmaps if exceeding max
		const newPast = [...this.past, this.present];
		while (newPast.length > MAX_HISTORY) {
			const removed = newPast.shift();
			removed?.image.close();
		}

		// Close future bitmaps
		for (const state of this.future) {
			state.image.close();
		}

		this.past = newPast;
		this.present = {
			image,
			adjustments: adjustments ?? this.present.adjustments,
			label
		};
		this.future = [];
	}

	undo(): ImageState | null {
		if (!this.present || this.past.length === 0) return null;
		const newFuture = [this.present, ...this.future];
		const previous = this.past[this.past.length - 1];
		this.future = newFuture;
		this.past = this.past.slice(0, -1);
		this.present = previous;
		return previous;
	}

	redo(): ImageState | null {
		if (!this.present || this.future.length === 0) return null;
		const newPast = [...this.past, this.present];
		const next = this.future[0];
		this.past = newPast;
		this.future = this.future.slice(1);
		this.present = next;
		return next;
	}

	getOriginal(): ImageState | null {
		if (this.past.length > 0) return this.past[0];
		return this.present;
	}

	cleanup(): void {
		for (const state of this.past) {
			state.image.close();
		}
		for (const state of this.future) {
			state.image.close();
		}
		if (this.present) {
			this.present.image.close();
		}
		this.past = [];
		this.future = [];
		this.present = null;
	}
}
