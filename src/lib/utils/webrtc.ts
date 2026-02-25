import { deflateSync, inflateSync } from 'fflate';

const ICE_SERVERS: RTCIceServer[] = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' },
	{ urls: 'stun:stun2.l.google.com:19302' },
	{ urls: 'stun:stun.cloudflare.com:3478' }
];

const ICE_GATHERING_TIMEOUT_MS = 15000;

type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'error';

export class PeerConnection {
	private pc: RTCPeerConnection;
	private _dataChannel: RTCDataChannel | null = null;

	public onStateChange: (state: ConnectionState) => void = () => {};
	public onDataChannel: (channel: RTCDataChannel) => void = () => {};

	private _state: ConnectionState = 'new';

	get state(): ConnectionState {
		return this._state;
	}

	get dataChannel(): RTCDataChannel | null {
		return this._dataChannel;
	}

	constructor() {
		this.pc = new RTCPeerConnection({
			iceServers: ICE_SERVERS,
			iceCandidatePoolSize: 10,
			bundlePolicy: 'max-bundle'
		});

		this.pc.onconnectionstatechange = () => {
			this.updateState();
		};

		this.pc.oniceconnectionstatechange = () => {
			this.updateState();
		};

		this.pc.ondatachannel = (event) => {
			this._dataChannel = event.channel;
			this._dataChannel.binaryType = 'arraybuffer';
			this.onDataChannel(this._dataChannel);
		};
	}

	/**
	 * Sender: create an SDP offer with bundled ICE candidates.
	 * Returns an encoded string to share with the receiver.
	 */
	async createOffer(): Promise<string> {
		this._dataChannel = this.pc.createDataChannel('file-transfer', { ordered: true });
		this._dataChannel.binaryType = 'arraybuffer';

		const offer = await this.pc.createOffer();
		await this.pc.setLocalDescription(offer);
		await this.waitForIceGathering();

		return encodeSDP(this.pc.localDescription!);
	}

	/**
	 * Sender: accept the receiver's answer code.
	 */
	async acceptAnswer(encodedAnswer: string): Promise<void> {
		if (this.pc.signalingState !== 'have-local-offer') {
			throw new Error('Already connected or connection in wrong state.');
		}
		const answer = decodeSDP(encodedAnswer);
		await this.pc.setRemoteDescription(answer);
		this.setState('connecting');
	}

	/**
	 * Receiver: accept the sender's offer code and return an answer code.
	 */
	async acceptOffer(encodedOffer: string): Promise<string> {
		if (this.pc.signalingState !== 'stable') {
			throw new Error('Cannot accept offer: connection already in progress.');
		}
		const offer = decodeSDP(encodedOffer);
		await this.pc.setRemoteDescription(offer);

		const answer = await this.pc.createAnswer();
		await this.pc.setLocalDescription(answer);
		await this.waitForIceGathering();

		this.setState('connecting');
		return encodeSDP(this.pc.localDescription!);
	}

	destroy(): void {
		this._dataChannel?.close();
		this.pc.close();
		this._dataChannel = null;
		this.setState('disconnected');
	}

	private setState(state: ConnectionState): void {
		if (this._state !== state) {
			this._state = state;
			this.onStateChange(state);
		}
	}

	private updateState(): void {
		const cs = this.pc.connectionState;
		const ice = this.pc.iceConnectionState;

		if (cs === 'connected' || ice === 'connected') {
			this.setState('connected');
		} else if (cs === 'failed' || ice === 'failed') {
			this.setState('error');
		} else if (cs === 'closed') {
			this.setState('disconnected');
		} else if (cs === 'disconnected' || ice === 'disconnected') {
			// Transient disconnects are common on real networks.
			// Only report failure after a grace period.
			if (this._state === 'connected') {
				setTimeout(() => {
					const current = this.pc.connectionState;
					if (current === 'disconnected' || current === 'failed') {
						this.setState('disconnected');
					}
				}, 5000);
			}
		} else if (cs === 'connecting' || ice === 'checking') {
			this.setState('connecting');
		}
	}

	private waitForIceGathering(): Promise<void> {
		return new Promise((resolve) => {
			if (this.pc.iceGatheringState === 'complete') {
				resolve();
				return;
			}

			const timeout = setTimeout(() => {
				this.pc.onicecandidate = null;
				this.pc.onicegatheringstatechange = null;
				resolve();
			}, ICE_GATHERING_TIMEOUT_MS);

			// null candidate signals gathering complete (most reliable method)
			this.pc.onicecandidate = (event) => {
				if (event.candidate === null) {
					clearTimeout(timeout);
					this.pc.onicecandidate = null;
					this.pc.onicegatheringstatechange = null;
					resolve();
				}
			};

			this.pc.onicegatheringstatechange = () => {
				if (this.pc.iceGatheringState === 'complete') {
					clearTimeout(timeout);
					this.pc.onicecandidate = null;
					this.pc.onicegatheringstatechange = null;
					resolve();
				}
			};
		});
	}
}

/**
 * Compress SDP and encode as a URL-safe base64 string.
 * Strips unnecessary lines to reduce size.
 */
function encodeSDP(sdp: RTCSessionDescription): string {
	const stripped = stripSDP(sdp.sdp);
	const json = JSON.stringify({ type: sdp.type, sdp: stripped });
	const data = new TextEncoder().encode(json);
	const compressed = deflateSync(data, { level: 9 });
	return uint8ToBase64(compressed);
}

/**
 * Decode a compressed SDP string back into an RTCSessionDescriptionInit.
 */
function decodeSDP(encoded: string): RTCSessionDescriptionInit {
	try {
		const compressed = base64ToUint8(encoded);
		const data = inflateSync(compressed);
		const json = new TextDecoder().decode(data);
		const parsed = JSON.parse(json) as { type: RTCSdpType; sdp: string };
		return { type: parsed.type, sdp: parsed.sdp };
	} catch {
		throw new Error('Invalid connection code. Please check and try again.');
	}
}

/**
 * Strip unnecessary SDP lines to reduce encoded size.
 */
function stripSDP(sdp: string): string {
	return sdp
		.split('\r\n')
		.filter((line) => {
			if (line.startsWith('a=extmap:')) return false;
			if (line.startsWith('a=rtpmap:')) return false;
			if (line.startsWith('a=fmtp:')) return false;
			if (line.startsWith('a=rtcp-fb:')) return false;
			if (line.startsWith('a=msid-semantic:')) return false;
			if (line.startsWith('a=ssrc:')) return false;
			return true;
		})
		.join('\r\n');
}

/**
 * Convert Uint8Array to URL-safe base64.
 */
function uint8ToBase64(data: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < data.length; i++) {
		binary += String.fromCharCode(data[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert URL-safe base64 back to Uint8Array.
 */
function base64ToUint8(str: string): Uint8Array {
	const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
