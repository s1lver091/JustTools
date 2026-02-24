import type { AdjustmentState } from './image-types';

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
	v_texCoord = a_texCoord;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_exposure;
uniform float u_temperature;
uniform float u_sharpness;
uniform vec2 u_texelSize;

void main() {
	vec4 color = texture(u_image, v_texCoord);

	// Exposure
	color.rgb *= pow(2.0, u_exposure);

	// Brightness
	color.rgb += u_brightness;

	// Contrast
	color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;

	// Saturation
	float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
	color.rgb = mix(vec3(luma), color.rgb, 1.0 + u_saturation);

	// Temperature
	color.r += u_temperature * 0.1;
	color.b -= u_temperature * 0.1;

	// Sharpness (unsharp mask)
	if (u_sharpness > 0.0) {
		vec3 blur = vec3(0.0);
		blur += texture(u_image, v_texCoord + vec2(-u_texelSize.x, 0.0)).rgb;
		blur += texture(u_image, v_texCoord + vec2(u_texelSize.x, 0.0)).rgb;
		blur += texture(u_image, v_texCoord + vec2(0.0, -u_texelSize.y)).rgb;
		blur += texture(u_image, v_texCoord + vec2(0.0, u_texelSize.y)).rgb;
		blur *= 0.25;
		color.rgb += (color.rgb - blur) * u_sharpness;
	}

	color.rgb = clamp(color.rgb, 0.0, 1.0);
	fragColor = color;
}`;

function compileShader(
	gl: WebGL2RenderingContext,
	source: string,
	type: number
): WebGLShader {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile error: ${info}`);
	}
	return shader;
}

function createProgram(
	gl: WebGL2RenderingContext,
	vertSrc: string,
	fragSrc: string
): WebGLProgram {
	const vert = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
	const frag = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);
	const program = gl.createProgram()!;
	gl.attachShader(program, vert);
	gl.attachShader(program, frag);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(`Program link error: ${info}`);
	}
	return program;
}

export interface WebGLRenderer {
	render: (adjustments: AdjustmentState) => void;
	updateImage: (image: ImageBitmap) => void;
	getCanvas: () => HTMLCanvasElement;
	getImageData: () => ImageData;
	destroy: () => void;
}

export function createWebGLRenderer(
	canvas: HTMLCanvasElement,
	image: ImageBitmap
): WebGLRenderer | null {
	const maybeGl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
	if (!maybeGl) return null;
	const gl = maybeGl;

	canvas.width = image.width;
	canvas.height = image.height;
	gl.viewport(0, 0, image.width, image.height);

	const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
	gl.useProgram(program);

	// Full-screen quad
	const posBuffer = gl.createBuffer()!;
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW
	);
	const posLoc = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	const texCoordBuffer = gl.createBuffer()!;
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
		gl.STATIC_DRAW
	);
	const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
	gl.enableVertexAttribArray(texCoordLoc);
	gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

	// Texture
	const texture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

	// Uniform locations
	const uBrightness = gl.getUniformLocation(program, 'u_brightness');
	const uContrast = gl.getUniformLocation(program, 'u_contrast');
	const uSaturation = gl.getUniformLocation(program, 'u_saturation');
	const uExposure = gl.getUniformLocation(program, 'u_exposure');
	const uTemperature = gl.getUniformLocation(program, 'u_temperature');
	const uSharpness = gl.getUniformLocation(program, 'u_sharpness');
	const uTexelSize = gl.getUniformLocation(program, 'u_texelSize');

	function render(adj: AdjustmentState): void {
		gl.useProgram(program);
		gl.uniform1f(uBrightness, adj.brightness / 100);
		gl.uniform1f(uContrast, adj.contrast / 100);
		gl.uniform1f(uSaturation, adj.saturation / 100);
		gl.uniform1f(uExposure, adj.exposure);
		gl.uniform1f(uTemperature, adj.temperature / 100);
		gl.uniform1f(uSharpness, adj.sharpness / 100);
		gl.uniform2f(uTexelSize, 1.0 / canvas.width, 1.0 / canvas.height);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	function updateImage(newImage: ImageBitmap): void {
		canvas.width = newImage.width;
		canvas.height = newImage.height;
		gl.viewport(0, 0, newImage.width, newImage.height);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, newImage);
	}

	function getImageData(): ImageData {
		const pixels = new Uint8Array(canvas.width * canvas.height * 4);
		gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		// Flip vertically since WebGL reads bottom-to-top
		const flipped = new Uint8Array(pixels.length);
		const rowSize = canvas.width * 4;
		for (let y = 0; y < canvas.height; y++) {
			const srcOffset = y * rowSize;
			const dstOffset = (canvas.height - 1 - y) * rowSize;
			flipped.set(pixels.subarray(srcOffset, srcOffset + rowSize), dstOffset);
		}
		return new ImageData(new Uint8ClampedArray(flipped.buffer), canvas.width, canvas.height);
	}

	function destroy(): void {
		gl.deleteTexture(texture);
		gl.deleteBuffer(posBuffer);
		gl.deleteBuffer(texCoordBuffer);
		gl.deleteProgram(program);
	}

	return { render, updateImage, getCanvas: () => canvas, getImageData, destroy };
}
