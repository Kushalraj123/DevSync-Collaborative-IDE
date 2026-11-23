import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

/**
 * VideoCallModal — Floating draggable video/audio call window.
 * Streams are passed as MediaStream objects (from React state in useWebRTC).
 */
export const VideoCallModal = ({
  callState,
  remoteEmail,
  isMuted, isCamOff, withVideo,
  localStream, remoteStream,
  onHangUp, onToggleMute, onToggleCamera,
}) => {
  const isMobile = useIsMobile();
  const isActive = callState === 'in-call' || callState === 'calling';
  const [expanded, setExpanded] = useState(false);

  const modalWidth = isMobile
    ? Math.min(window.innerWidth - 20, expanded ? 480 : 320)
    : (expanded ? 640 : 360);
  const modalHeight = isMobile
    ? (expanded ? 320 : 210)
    : (expanded ? 440 : 240);

  // Draggable position (clamped to viewport)
  const [pos, setPos] = useState(() => ({
    x: Math.max(10, window.innerWidth - (window.innerWidth < 768 ? 330 : 380)),
    y: window.innerWidth < 768 ? 78 : 80,
  }));
  const dragRef = useRef({ active: false, ox: 0, oy: 0 });

  useEffect(() => {
    setPos(prev => ({
      x: Math.max(10, Math.min(prev.x, window.innerWidth - modalWidth - 10)),
      y: Math.max(10, Math.min(prev.y, window.innerHeight - 120)),
    }));
  }, [modalWidth, isMobile, isActive]);

  const startDrag = (clientX, clientY) => {
    dragRef.current = { active: true, ox: clientX - pos.x, oy: clientY - pos.y };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragRef.current.active) return;
    const nextX = Math.max(8, Math.min(clientX - dragRef.current.ox, window.innerWidth - modalWidth - 8));
    const nextY = Math.max(8, Math.min(clientY - dragRef.current.oy, window.innerHeight - 100));
    setPos({ x: nextX, y: nextY });
  };

  const onMouseDown = (e) => {
    startDrag(e.clientX, e.clientY);
    const onMove = (ev) => moveDrag(ev.clientX, ev.clientY);
    const onUp = () => {
      dragRef.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onTouchStart = (e) => {
    if (!e.touches[0]) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
    const onMove = (ev) => {
      if (ev.touches[0]) moveDrag(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const onEnd = () => {
      dragRef.current.active = false;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  // Video element refs
  const localVidRef  = useRef(null);
  const remoteVidRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // ── Attach LOCAL stream whenever stream, mount state, or cam toggle changes ─
  useEffect(() => {
    const el = localVidRef.current;
    if (el && localStream && isActive && withVideo && !isCamOff) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch(() => {});
    }
  }, [localStream, isActive, withVideo, isCamOff]);

  // ── Attach REMOTE stream whenever stream or mount state changes ───────────
  useEffect(() => {
    const el = remoteVidRef.current;
    if (el && remoteStream && isActive && withVideo) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch(() => {});
    }
  }, [remoteStream, isActive, withVideo]);

  // ── Audio-only: attach remote stream to dedicated <audio> element ─────────
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (el && remoteStream && isActive && !withVideo) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch(() => {});
    }
  }, [remoteStream, isActive, withVideo]);

  if (!isActive) return null;

  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().length > 0);
  const hasLocalVideo = Boolean(localStream && localStream.getVideoTracks().length > 0 && !isCamOff);

  return (
    <AnimatePresence>
      <motion.div
        key="video-modal"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        style={{
          position: 'fixed', left: pos.x, top: pos.y, width: modalWidth,
          zIndex: 9100, borderRadius: 16, overflow: 'hidden',
          background: '#0d0d0d', border: '1px solid #238636',
          boxShadow: '0 16px 60px rgba(0,0,0,0.8)',
          userSelect: 'none',
        }}
      >
        {/* Hidden audio element for voice-only calls */}
        {!withVideo && <audio ref={remoteAudioRef} autoPlay playsInline />}

        {/* ── Title bar (drag handle) ── */}
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'linear-gradient(90deg, #0d2b14, #0a2010)',
            cursor: 'grab',
            borderBottom: '1px solid #1a3a1a',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: callState === 'in-call' ? '#4caf50' : '#ff9800',
              }}
            />
            <span style={{
              fontSize: 12, fontWeight: 700, color: '#4caf50',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {callState === 'calling' ? 'Calling…' : (remoteEmail || 'Connected')}
            </span>
            {withVideo && (
              <span style={{
                fontSize: 10, color: '#888', background: '#1a3a1a', flexShrink: 0,
                padding: '1px 6px', borderRadius: 4, border: '1px solid #2a4a2a',
              }}>VIDEO</span>
            )}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 2, flexShrink: 0 }}
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* ── Video / Audio area ── */}
        <div style={{ position: 'relative', height: modalHeight, background: '#0a0a0a' }}>
          {withVideo ? (
            <>
              <video
                ref={remoteVidRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {!hasRemoteVideo && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#0d1117', color: '#8b949e', fontSize: 12,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: '#1a2e1a', border: '1px solid #238636',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#4caf50', fontWeight: 700, fontSize: 20,
                  }}>
                    {(remoteEmail || '?').charAt(0).toUpperCase()}
                  </div>
                  <span>{callState === 'calling' ? 'Waiting for answer…' : 'Connecting video…'}</span>
                </div>
              )}
            </>
          ) : (
            /* Audio-only placeholder */
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #238636, #2ea043)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, boxShadow: '0 0 30px #23863660',
                }}
              >
                🎙️
              </motion.div>
              <span style={{ color: '#4caf50', fontSize: 13, fontWeight: 700 }}>
                {callState === 'calling' ? 'Ringing…' : remoteEmail}
              </span>
              <span style={{ color: '#555', fontSize: 11 }}>Voice call</span>
            </div>
          )}

          {/* Local camera PiP */}
          {withVideo && (
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              width: expanded ? 140 : 96, height: expanded ? 96 : 68,
              borderRadius: 10, overflow: 'hidden',
              border: '2px solid #238636',
              background: '#111',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              zIndex: 5,
            }}>
              {!hasLocalVideo ? (
                <div style={{
                  width: '100%', height: '100%', background: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
                }}>
                  <VideoOff size={20} />
                </div>
              ) : (
                <video
                  ref={localVidRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Controls ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 14px', background: '#0a0a0a', borderTop: '1px solid #1a1a1a',
        }}>
          {/* Mute */}
          <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute mic' : 'Mute mic'}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: isMuted ? '#3a1a1a' : '#1e3a1e',
              border: `1px solid ${isMuted ? '#e51400' : '#238636'}`,
              color: isMuted ? '#e51400' : '#4caf50',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </motion.button>

          {/* Camera toggle — video calls only */}
          {withVideo && (
            <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
              onClick={onToggleCamera}
              title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: isCamOff ? '#3a1a1a' : '#1e3a1e',
                border: `1px solid ${isCamOff ? '#e51400' : '#238636'}`,
                color: isCamOff ? '#e51400' : '#4caf50',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {isCamOff ? <VideoOff size={16} /> : <Video size={16} />}
            </motion.button>
          )}

          {/* Hang up */}
          <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            onClick={onHangUp}
            title="Hang up"
            style={{
              width: 46, height: 46, borderRadius: '50%',
              background: '#c50000', border: '1px solid #e51400',
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px #e5140060',
            }}>
            <PhoneOff size={20} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
