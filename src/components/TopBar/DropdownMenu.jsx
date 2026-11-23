import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export const DropdownMenu = ({ label, items, isOpen, onToggle, closeAll }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 32, left: 8 });

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuWidth = Math.min(240, window.innerWidth - 16);
      const clampedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      setPos({ top: rect.bottom + 2, left: clampedLeft });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeAll();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, closeAll]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <div
        className={`menu-item whitespace-nowrap ${isOpen ? 'bg-[rgba(255,255,255,0.1)]' : ''}`}
        onClick={onToggle}
        onMouseEnter={() => {
          // If any menu is open, hovering over another one should open it
          if (document.querySelector('.menu-open')) {
            onToggle();
          }
        }}
      >
        {label}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: '70dvh',
            overflowY: 'auto',
          }}
          className="z-[100] bg-[#252526] border border-[#454545] shadow-lg py-1 min-w-[220px] md:min-w-[240px] text-[13px] menu-open rounded-sm"
        >
          {items.map((item, idx) => {
            if (item.separator) {
              return <div key={idx} className="h-px bg-[#454545] my-1 mx-2" />;
            }
            return (
              <div
                key={idx}
                className="px-4 md:px-6 py-1.5 flex justify-between items-center hover:bg-[#04395e] cursor-pointer text-[#cccccc] hover:text-white"
                onClick={() => {
                  if (item.action) item.action();
                  closeAll();
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && <span className="text-[#858585] text-[11px] ml-4 hidden sm:inline">{item.shortcut}</span>}
                {item.submenu && <ChevronRight size={14} className="text-[#858585] ml-4" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
