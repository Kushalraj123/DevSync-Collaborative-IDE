import React, { useState, useRef, useEffect } from 'react';
import {
  Files, Search, Blocks, MessageSquare, Phone, Video,
  User as UserIcon, Settings, Copy, Check, LogOut, RotateCcw, X, Minus, Plus
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useCollaboration } from '../../context/CollaborationContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export const ActivityBar = () => {
  const {
    activeSidebarTab, setActiveSidebarTab,
    isSidebarOpen, setIsSidebarOpen,
    startVoiceCall, incomingCall, username, awarenessUsers,
    editorSettings, updateEditorSetting, resetEditorSettings
  } = useEditor();

  const { connected, roomId, awareness } = useCollaboration();
  const { isHost, userRole } = useAuth();

  const [openPopover, setOpenPopover] = useState(null); // null | 'account' | 'settings'
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenPopover(null);
      }
    };
    if (openPopover) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [openPopover]);

  const hasIncomingCall = incomingCall && incomingCall.caller !== username;

  const myUser = awarenessUsers?.find(
    (u) => (awareness?.clientID != null && u.clientId === awareness.clientID) || u.name === username
  );

  const startVideoCall = () => {
    if (typeof window.__devSyncStartVideoCall === 'function') {
      window.__devSyncStartVideoCall();
    }
  };

  const handleTabClick = (tab) => {
    setOpenPopover(null);
    if (isSidebarOpen && activeSidebarTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveSidebarTab(tab);
      setIsSidebarOpen(true);
    }
  };

  const handleCopyInvite = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId || '')}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy invite link:', url);
    }
  };

  const handleLeaveWorkspace = () => {
    if (window.confirm('Leave this collaborative workspace?')) {
      window.location.href = `${window.location.origin}${window.location.pathname}`;
    }
  };

  const iconClass = (tab) =>
    `cursor-pointer ${isSidebarOpen && activeSidebarTab === tab
      ? 'text-white border-l-2 border-white ml-[2px] pl-[2px]'
      : 'text-[#858585] hover:text-white'
    }`;

  return (
    <div ref={popoverRef} className="activity-bar bg-(--vscode-activity-bar) flex flex-col items-center py-3 md:py-4 gap-5 md:gap-6 z-40 relative">
      <Files onClick={() => handleTabClick('explorer')} className={iconClass('explorer')} size={22} strokeWidth={1.5} />
      <Search onClick={() => handleTabClick('search')} className={iconClass('search')} size={22} strokeWidth={1.5} />
      <Blocks onClick={() => handleTabClick('extensions')} className={iconClass('extensions')} size={22} strokeWidth={1.5} />
      <MessageSquare onClick={() => handleTabClick('chat')} className={iconClass('chat')} size={22} strokeWidth={1.5} />

      {/* ── Voice Call ── */}
      <div className="relative">
        <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          onClick={startVoiceCall} title="Start Voice Call"
          className="cursor-pointer text-[#858585] hover:text-white">
          <Phone size={22} strokeWidth={1.5} />
        </motion.div>
        {hasIncomingCall && (
          <motion.div
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#238636] border-2 border-[#252526]"
          />
        )}
      </div>

      {/* ── Video Call ── */}
      <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
        onClick={startVideoCall} title="Start Video Call"
        className="cursor-pointer text-[#858585] hover:text-[#4caf50]">
        <Video size={22} strokeWidth={1.5} />
      </motion.div>

      <div className="flex-1" />

      {/* ── Account Button ── */}
      <button
        onClick={() => setOpenPopover((prev) => (prev === 'account' ? null : 'account'))}
        title="Account & Session"
        className={`relative p-1 rounded cursor-pointer transition-colors ${openPopover === 'account' ? 'text-white bg-[rgba(255,255,255,0.12)]' : 'text-[#858585] hover:text-white'}`}
      >
        <UserIcon size={22} strokeWidth={1.5} />
        <span
          className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-[#333333]"
          style={{ backgroundColor: connected ? (myUser?.color || '#22c55e') : '#f59e0b' }}
        />
      </button>

      {/* ── Settings Button ── */}
      <button
        onClick={() => setOpenPopover((prev) => (prev === 'settings' ? null : 'settings'))}
        title="Editor Settings"
        className={`p-1 rounded cursor-pointer transition-colors ${openPopover === 'settings' ? 'text-white bg-[rgba(255,255,255,0.12)]' : 'text-[#858585] hover:text-white'}`}
      >
        <Settings size={22} strokeWidth={1.5} />
      </button>

      {/* ── Account Popover ── */}
      {openPopover === 'account' && (
        <div
          style={{
            position: 'fixed',
            left: 52,
            bottom: 30,
            width: 'min(290px, calc(100vw - 60px))',
            maxHeight: '75dvh',
            overflowY: 'auto',
          }}
          className="z-[110] bg-[#252526] border border-[#454545] rounded-lg shadow-2xl text-[#cccccc] text-[13px] overflow-hidden"
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#383838] bg-[#1e1e1e]">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#9ca3af]">Account & Session</span>
            <button onClick={() => setOpenPopover(null)} className="text-[#858585] hover:text-white cursor-pointer">
              <X size={15} />
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: myUser?.color || '#007acc' }}
              >
                {(username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-semibold truncate">{username || 'Guest'}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#007acc30] text-[#4fc1ff] uppercase font-semibold">
                    {isHost ? 'HOST' : (userRole || 'editor').toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-[#9ca3af]">
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
                    {connected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1e1e1e] border border-[#383838] rounded-md p-2.5 space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#858585]">Room ID</span>
                <span className="font-mono text-[#e5e7eb] truncate ml-2">{roomId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#858585]">Active Members</span>
                <span className="text-[#e5e7eb] font-medium">{awarenessUsers?.length || 1}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyInvite}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-[#007acc] hover:bg-[#0062a3] text-white font-medium text-[12px] cursor-pointer transition-colors"
              >
                {copied ? <><Check size={14} /> Invite Link Copied!</> : <><Copy size={14} /> Copy Invite Link</>}
              </button>
              <button
                onClick={handleLeaveWorkspace}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-[#3a2020] hover:bg-[#522727] text-[#f87171] border border-[#f8717140] font-medium text-[12px] cursor-pointer transition-colors"
              >
                <LogOut size={14} /> Leave Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Popover ── */}
      {openPopover === 'settings' && (
        <div
          style={{
            position: 'fixed',
            left: 52,
            bottom: 30,
            width: 'min(300px, calc(100vw - 60px))',
            maxHeight: '75dvh',
            overflowY: 'auto',
          }}
          className="z-[110] bg-[#252526] border border-[#454545] rounded-lg shadow-2xl text-[#cccccc] text-[13px] overflow-hidden"
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#383838] bg-[#1e1e1e]">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#9ca3af]">Editor Settings</span>
            <button onClick={() => setOpenPopover(null)} className="text-[#858585] hover:text-white cursor-pointer">
              <X size={15} />
            </button>
          </div>

          <div className="p-3.5 space-y-3.5 text-[12px]">
            {/* Theme */}
            <div className="space-y-1.5">
              <label className="text-[#9ca3af] font-medium block">Editor Theme</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'vs-dark', label: 'Dark' },
                  { id: 'light', label: 'Light' },
                  { id: 'hc-black', label: 'Contrast' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateEditorSetting('theme', t.id)}
                    className={`py-1.5 px-2 rounded border cursor-pointer transition-colors ${
                      editorSettings?.theme === t.id
                        ? 'bg-[#007acc] border-[#007acc] text-white font-semibold'
                        : 'bg-[#1e1e1e] border-[#383838] text-[#cccccc] hover:border-[#555]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="flex items-center justify-between">
              <span className="text-[#9ca3af] font-medium">Font Size</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateEditorSetting('fontSize', Math.max(11, (editorSettings?.fontSize ?? 14) - 1))}
                  className="p-1 rounded bg-[#1e1e1e] border border-[#383838] hover:border-[#666] text-white cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <span className="w-10 text-center font-mono text-white">{editorSettings?.fontSize ?? 14}px</span>
                <button
                  onClick={() => updateEditorSetting('fontSize', Math.min(24, (editorSettings?.fontSize ?? 14) + 1))}
                  className="p-1 rounded bg-[#1e1e1e] border border-[#383838] hover:border-[#666] text-white cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Tab Size */}
            <div className="flex items-center justify-between">
              <span className="text-[#9ca3af] font-medium">Tab Size</span>
              <div className="flex gap-1.5">
                {[2, 4].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateEditorSetting('tabSize', size)}
                    className={`px-2.5 py-1 rounded border cursor-pointer ${
                      (editorSettings?.tabSize ?? 2) === size
                        ? 'bg-[#007acc] border-[#007acc] text-white font-semibold'
                        : 'bg-[#1e1e1e] border-[#383838] text-[#cccccc] hover:border-[#555]'
                    }`}
                  >
                    {size} Spaces
                  </button>
                ))}
              </div>
            </div>

            {/* Word Wrap */}
            <div className="flex items-center justify-between">
              <span className="text-[#9ca3af] font-medium">Word Wrap</span>
              <button
                onClick={() => updateEditorSetting('wordWrap', editorSettings?.wordWrap === 'on' ? 'off' : 'on')}
                className={`px-3 py-1 rounded cursor-pointer font-medium transition-colors ${
                  editorSettings?.wordWrap === 'on'
                    ? 'bg-[#238636] text-white'
                    : 'bg-[#1e1e1e] border border-[#383838] text-[#9ca3af]'
                }`}
              >
                {editorSettings?.wordWrap === 'on' ? 'On' : 'Off'}
              </button>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between">
              <span className="text-[#9ca3af] font-medium">Minimap (Desktop)</span>
              <button
                onClick={() => updateEditorSetting('minimap', !(editorSettings?.minimap ?? true))}
                className={`px-3 py-1 rounded cursor-pointer font-medium transition-colors ${
                  (editorSettings?.minimap ?? true)
                    ? 'bg-[#238636] text-white'
                    : 'bg-[#1e1e1e] border border-[#383838] text-[#9ca3af]'
                }`}
              >
                {(editorSettings?.minimap ?? true) ? 'On' : 'Off'}
              </button>
            </div>

            {/* Cursor Blinking */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#9ca3af] font-medium">Cursor Style</span>
              <select
                value={editorSettings?.cursorBlinking || 'smooth'}
                onChange={(e) => updateEditorSetting('cursorBlinking', e.target.value)}
                className="bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 text-[#e5e7eb] outline-none cursor-pointer"
              >
                <option value="smooth">Smooth</option>
                <option value="blink">Blink</option>
                <option value="phase">Phase</option>
                <option value="expand">Expand</option>
                <option value="solid">Solid</option>
              </select>
            </div>

            <div className="pt-1 border-t border-[#383838]">
              <button
                onClick={resetEditorSettings}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#383838] text-[#cccccc] cursor-pointer transition-colors"
              >
                <RotateCcw size={13} /> Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
