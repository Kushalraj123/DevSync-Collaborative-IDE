import React from 'react';
import { Files, Search, Blocks, MessageSquare, Phone, Video, User as UserIcon, Settings } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { motion } from 'framer-motion';

export const ActivityBar = () => {
  const {
    activeSidebarTab, setActiveSidebarTab,
    isSidebarOpen, setIsSidebarOpen,
    startVoiceCall, incomingCall, username
  } = useEditor();

  const hasIncomingCall = incomingCall && incomingCall.caller !== username;

  const startVideoCall = () => {
    if (typeof window.__devSyncStartVideoCall === 'function') {
      window.__devSyncStartVideoCall();
    }
  };

  const handleTabClick = (tab) => {
    if (isSidebarOpen && activeSidebarTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveSidebarTab(tab);
      setIsSidebarOpen(true);
    }
  };

  const iconClass = (tab) =>
    `cursor-pointer ${isSidebarOpen && activeSidebarTab === tab
      ? 'text-white border-l-2 border-white ml-[2px] pl-[2px]'
      : 'text-[#858585] hover:text-white'
    }`;

  return (
    <div className="activity-bar bg-(--vscode-activity-bar) flex flex-col items-center py-3 md:py-4 gap-5 md:gap-6 z-40">
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
      <UserIcon className="text-[#858585] hover:text-white cursor-pointer" size={22} strokeWidth={1.5} />
      <Settings className="text-[#858585] hover:text-white cursor-pointer" size={22} strokeWidth={1.5} />
    </div>
  );
};
