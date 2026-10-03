/**
 * One phone-to-phone video link. Each link runs one way only: the side with
 * something to send offers, the side that only watches answers. Nothing is ever
 * renegotiated, so two phones can set a link up without arguing over who speaks
 * first. Connection descriptions travel through the app's own records.
 */
const ICE_SERVERS = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

const GATHER_TIMEOUT_MS = 8000;

function description(pc) {
  const local = pc.localDescription;
  return local ? { type: local.type, sdp: local.sdp } : null;
}

/** Wait for the network addresses, so one description carries everything. */
function iceReady(pc) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(done, GATHER_TIMEOUT_MS);
  });
}

export default class LiveLink {
  constructor({ tracks = [], onStream, onState } = {}) {
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.stream = new MediaStream();
    this.closed = false;
    this.onStream = onStream;
    this.onState = onState;

    this.pc.onconnectionstatechange = () => {
      onState?.(this.pc.connectionState);
    };
    this.pc.ontrack = (event) => {
      this.stream.addTrack(event.track);
      onStream?.(this.stream);
    };
    tracks.filter(Boolean).forEach((track) => this.pc.addTrack(track));
  }

  /** Sender side: announce what this phone is sending. */
  async offer() {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await iceReady(this.pc);
    return description(this.pc);
  }

  /** Receiver side: accept the offer and answer it. */
  async answer(payload) {
    await this.pc.setRemoteDescription(payload);
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await iceReady(this.pc);
    return description(this.pc);
  }

  async accept(payload) {
    await this.pc.setRemoteDescription(payload);
  }

  /** Swapping cameras happens inside the link that is already open. */
  replaceVideo(track) {
    if (!track || this.closed) return;
    const sender = this.pc.getSenders().find((item) => item.track?.kind === "video");
    if (sender) sender.replaceTrack(track).catch(() => {});
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stream.getTracks().forEach((track) => track.stop());
    try {
      this.pc.close();
    } catch (err) {
      // already closed
    }
  }
}