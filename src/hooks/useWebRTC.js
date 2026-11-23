import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useWebRTC — Real peer-to-peer voice + video call using WebRTC.
 * Signaling via shared Yjs document (no extra server needed).
 *
 * voiceSignal map keys:
 *   'offer'        { from, sdp, type, withVideo, callId }
 *   'answer'       { from, sdp, type, callId }
 *   'ice-<email>'  { callId, candidates: [...] }
 *   'hangup'       { from, callId, ts }
 */
const buildIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
};

const ICE_SERVERS = buildIceServers();

export function useWebRTC({ ydoc, email, onIncomingCall, onCallEnded }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const addedIceRef = useRef(new Set());
  const activeCallIdRef = useRef(null);
  const pendingIceRef = useRef([]);
  const disconnectTimerRef = useRef(null);
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
    onCallEndedRef.current = onCallEnded;
  }, [onIncomingCall, onCallEnded]);

  const [callState,   setCallState]   = useState('idle'); // idle|calling|in-call|receiving
  const [remoteEmail, setRemoteEmail] = useState(null);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isCamOff,    setIsCamOff]    = useState(false);
  const [withVideo,   setWithVideo]   = useState(false);

  // ── Streams as state so VideoCallModal re-renders when they arrive ────────
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const sigMap = useCallback(() => ydoc?.getMap('voiceSignal'), [ydoc]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearTimeout(disconnectTimerRef.current);
    disconnectTimerRef.current = null;
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    addedIceRef.current = new Set();
    pendingIceRef.current = [];
    activeCallIdRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteEmail(null);
    setIsMuted(false);
    setIsCamOff(false);
    setWithVideo(false);
  }, []);

  // ── Clear stale ICE entries for a new call ────────────────────────────────
  const clearStaleSignals = useCallback(() => {
    const map = sigMap();
    if (!map || !ydoc) return;
    ydoc.transact(() => {
      map.delete('answer');
      map.delete('hangup');
      for (const k of Array.from(map.keys())) {
        if (k.startsWith('ice-')) map.delete(k);
      }
    });
  }, [sigMap, ydoc]);

  // ── Apply ICE candidates without duplicates ───────────────────────────────
  const applyIceList = useCallback(async (pc, candidates) => {
    if (!pc || !Array.isArray(candidates)) return;
    for (const c of candidates) {
      const sig = `${c.candidate}|${c.sdpMid}|${c.sdpMLineIndex}`;
      if (addedIceRef.current.has(sig)) continue;
      if (!pc.remoteDescription) {
        pendingIceRef.current.push(c);
        continue;
      }
      addedIceRef.current.add(sig);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate skipped:', err?.message);
      }
    }
  }, []);

  const flushPendingIce = useCallback(async (pc, fromEmail) => {
    const queued = [...pendingIceRef.current];
    pendingIceRef.current = [];
    await applyIceList(pc, queued);

    const entry = sigMap()?.get(`ice-${fromEmail}`);
    const list = Array.isArray(entry) ? entry : (entry?.candidates || []);
    await applyIceList(pc, list);
  }, [applyIceList, sigMap]);

  // ── Build PeerConnection ──────────────────────────────────────────────────
  const createPC = useCallback((stream, callId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    addedIceRef.current = new Set();
    pendingIceRef.current = [];
    remoteStreamRef.current = new MediaStream();

    // Add local tracks
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || activeCallIdRef.current !== callId) return;
      const key = `ice-${email}`;
      const existing = sigMap()?.get(key);
      const prevList = existing?.callId === callId ? (existing.candidates || []) : [];
      sigMap()?.set(key, {
        callId,
        candidates: [...prevList, candidate.toJSON()],
      });
    };

    pc.ontrack = (event) => {
      const targetStream = remoteStreamRef.current || new MediaStream();
      remoteStreamRef.current = targetStream;

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!targetStream.getTracks().some(t => t.id === track.id)) {
            targetStream.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!targetStream.getTracks().some(t => t.id === event.track.id)) {
          targetStream.addTrack(event.track);
        }
      }

      // Emit a fresh MediaStream wrapper reference so React always re-renders & attaches srcObject
      setRemoteStream(new MediaStream(targetStream.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
        setCallState('in-call');
      } else if (pc.connectionState === 'disconnected') {
        // Give mobile / Wi-Fi hiccups a brief window to recover before ending the call
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current && pcRef.current.connectionState === 'disconnected') {
            cleanup();
            onCallEndedRef.current?.();
          }
        }, 6000);
      } else if (['failed', 'closed'].includes(pc.connectionState)) {
        cleanup();
        onCallEndedRef.current?.();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [email, sigMap, cleanup]);

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = async (video = false) => {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    const videoConstraints = video
      ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      : false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return { stream, hasVideo: stream.getVideoTracks().length > 0 };
    } catch (err) {
      // If camera is unavailable/busy during a video call, fall back to audio-only instead of aborting
      if (video && (err.name === 'NotReadableError' || err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          setIsCamOff(true);
          return { stream: audioOnly, hasVideo: false };
        } catch (audioErr) {
          console.error('[WebRTC] Audio fallback failed:', audioErr);
        }
      }

      console.error('[WebRTC] getUserMedia error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Camera / Microphone access denied.\n\nClick the lock icon in your browser address bar → Site Settings → Allow Camera & Microphone.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera/microphone found. Please connect a device and try again.');
      } else {
        alert(`Could not access camera/microphone: ${err.message || err.name}`);
      }
      throw err;
    }
  };

  // ── START VOICE CALL ──────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (callState !== 'idle') return;
    try {
      const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      activeCallIdRef.current = callId;
      const { stream } = await getMedia(false);
      clearStaleSignals();
      const pc = createPC(stream, callId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sigMap()?.set('offer', { from: email, sdp: offer.sdp, type: offer.type, withVideo: false, callId });
      setWithVideo(false);
      setCallState('calling');
    } catch (_) {
      cleanup();
    }
  }, [callState, email, createPC, sigMap, clearStaleSignals, cleanup]);

  // ── START VIDEO CALL ──────────────────────────────────────────────────────
  const startVideoCall = useCallback(async () => {
    if (callState !== 'idle') return;
    try {
      const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      activeCallIdRef.current = callId;
      const { stream } = await getMedia(true);
      clearStaleSignals();
      const pc = createPC(stream, callId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sigMap()?.set('offer', { from: email, sdp: offer.sdp, type: offer.type, withVideo: true, callId });
      setWithVideo(true);
      setCallState('calling');
    } catch (_) {
      cleanup();
    }
  }, [callState, email, createPC, sigMap, clearStaleSignals, cleanup]);

  // ── ACCEPT CALL ───────────────────────────────────────────────────────────
  const acceptCall = useCallback(async (offerData, muted = false) => {
    try {
      const callId = offerData.callId || `call-${Date.now()}`;
      activeCallIdRef.current = callId;
      const video = !!offerData.withVideo;
      const { stream, hasVideo } = await getMedia(video);
      if (muted) stream.getAudioTracks().forEach(t => { t.enabled = false; });

      const pc = createPC(stream, callId);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: offerData.type, sdp: offerData.sdp }));
      await flushPendingIce(pc, offerData.from);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sigMap()?.set('answer', { from: email, sdp: answer.sdp, type: answer.type, callId });

      setRemoteEmail(offerData.from);
      setWithVideo(video);
      setIsCamOff(video && !hasVideo);
      setIsMuted(muted);
      setCallState('in-call');
    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err);
      cleanup();
    }
  }, [email, createPC, sigMap, flushPendingIce, cleanup]);

  // ── REJECT ────────────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    sigMap()?.set('hangup', { from: email, callId: activeCallIdRef.current, ts: Date.now() });
    sigMap()?.delete('offer');
    cleanup();
  }, [email, sigMap, cleanup]);

  // ── HANG UP ───────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    const map = sigMap();
    if (map && ydoc) {
      ydoc.transact(() => {
        map.set('hangup', { from: email, callId: activeCallIdRef.current, ts: Date.now() });
        map.delete('offer');
        map.delete('answer');
        for (const k of Array.from(map.keys())) {
          if (k.startsWith('ice-')) map.delete(k);
        }
      });
    }
    cleanup();
    onCallEndedRef.current?.();
  }, [email, sigMap, ydoc, cleanup]);

  // ── MUTE ─────────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setIsMuted(prev => {
      const next = !prev;
      stream.getAudioTracks().forEach(t => { t.enabled = !next; });
      return next;
    });
  }, []);

  // ── CAMERA ON/OFF ─────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;
    setIsCamOff(prev => {
      const next = !prev;
      videoTracks.forEach(t => { t.enabled = !next; });
      return next;
    });
  }, []);

  // ── Observe Yjs signals ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ydoc || !email) return;
    const map = ydoc.getMap('voiceSignal');

    const process = async (keysChanged) => {
      for (const key of keysChanged) {
        const val = map.get(key);

        // Incoming offer (for callee)
        if (key === 'offer' && val && val.from !== email) {
          setCallState(prev => {
            if (prev === 'idle') {
              setRemoteEmail(val.from);
              setWithVideo(!!val.withVideo);
              onIncomingCallRef.current?.({ caller: val.from, offer: val, withVideo: !!val.withVideo });
              return 'receiving';
            }
            return prev;
          });
        }

        // Incoming answer (for caller)
        if (key === 'answer' && val && val.from !== email && pcRef.current) {
          if (val.callId && activeCallIdRef.current && val.callId !== activeCallIdRef.current) continue;
          try {
            const pc = pcRef.current;
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: val.type, sdp: val.sdp }));
              await flushPendingIce(pc, val.from);
              setRemoteEmail(val.from);
              setCallState('in-call');
            }
          } catch (err) {
            console.error('[WebRTC] answer err:', err);
          }
        }

        // Remote ICE
        if (key.startsWith('ice-') && key !== `ice-${email}` && pcRef.current && val) {
          const candidates = Array.isArray(val) ? val : (val.candidates || []);
          if (!Array.isArray(val) && val.callId && activeCallIdRef.current && val.callId !== activeCallIdRef.current) {
            continue;
          }
          await applyIceList(pcRef.current, candidates);
        }

        // Hangup
        if (key === 'hangup' && val) {
          const sender = typeof val === 'string' ? val : val.from;
          if (sender && sender !== email) {
            cleanup();
            onCallEndedRef.current?.();
          }
        }
      }
    };

    const handleChange = (event) => process(Array.from(event.keysChanged));
    map.observe(handleChange);

    // Check for an existing offer on mount (in case callee loaded late)
    const existingOffer = map.get('offer');
    if (existingOffer && existingOffer.from !== email) {
      process(['offer']);
    }

    return () => {
      map.unobserve(handleChange);
    };
  }, [ydoc, email, applyIceList, flushPendingIce, cleanup]);

  // Ensure tracks are cleaned up on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    callState, remoteEmail, isMuted, isCamOff, withVideo,
    localStream, remoteStream,
    startCall, startVideoCall, acceptCall, rejectCall, hangUp,
    toggleMute, toggleCamera,
  };
}
