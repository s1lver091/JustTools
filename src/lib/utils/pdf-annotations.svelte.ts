export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface HighlightAnnotation {
	id: string;
	type: 'highlight';
	page: number;
	color: string;
	rects: Rect[];
}

export interface UnderlineAnnotation {
	id: string;
	type: 'underline';
	page: number;
	color: string;
	rects: Rect[];
}

export interface StrikethroughAnnotation {
	id: string;
	type: 'strikethrough';
	page: number;
	color: string;
	rects: Rect[];
}

export interface PenAnnotation {
	id: string;
	type: 'pen';
	page: number;
	color: string;
	thickness: number;
	points: { x: number; y: number }[];
}

export interface ShapeAnnotation {
	id: string;
	type: 'shape';
	page: number;
	color: string;
	thickness: number;
	shapeType: 'rectangle' | 'circle' | 'arrow' | 'line';
	start: { x: number; y: number };
	end: { x: number; y: number };
}

export interface TextAnnotation {
	id: string;
	type: 'text';
	page: number;
	color: string;
	content: string;
	position: { x: number; y: number };
	fontSize: number;
}

export type Annotation =
	| HighlightAnnotation
	| UnderlineAnnotation
	| StrikethroughAnnotation
	| PenAnnotation
	| ShapeAnnotation
	| TextAnnotation;

export type AnnotationTool =
	| 'highlight'
	| 'underline'
	| 'strikethrough'
	| 'pen'
	| 'rectangle'
	| 'circle'
	| 'arrow'
	| 'line'
	| 'text'
	| 'eraser';

export class AnnotationHistory {
	annotations = $state<Annotation[]>([]);
	private undoStack = $state<Annotation[][]>([]);
	private redoStack = $state<Annotation[][]>([]);

	get canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	add(annotation: Annotation): void {
		this.undoStack.push([...this.annotations]);
		this.redoStack = [];
		this.annotations = [...this.annotations, annotation];
	}

	remove(id: string): void {
		this.undoStack.push([...this.annotations]);
		this.redoStack = [];
		this.annotations = this.annotations.filter((a) => a.id !== id);
	}

	undo(): void {
		if (this.undoStack.length === 0) return;
		this.redoStack.push([...this.annotations]);
		this.annotations = this.undoStack.pop()!;
	}

	redo(): void {
		if (this.redoStack.length === 0) return;
		this.undoStack.push([...this.annotations]);
		this.annotations = this.redoStack.pop()!;
	}

	getForPage(page: number): Annotation[] {
		return this.annotations.filter((a) => a.page === page);
	}

	getAll(): Annotation[] {
		return this.annotations;
	}
}
