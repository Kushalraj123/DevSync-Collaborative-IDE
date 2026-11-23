import React, { useState } from 'react';
import { Hexagon, PanelLeft, Play, Terminal as TerminalIcon, Eye } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';
import { useEditor } from '../../context/EditorContext';

export const TopBar = () => {
  const { 
    setCreatingNode, isBottomPanelOpen, setIsBottomPanelOpen, 
    openFile, openFolder, isSidebarOpen, setIsSidebarOpen, runCode, 
    bottomPanelTab, setBottomPanelTab, setActiveSidebarTab, activeFile
  } = useEditor();
  
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menuName) => {
    if (openMenu === menuName) setOpenMenu(null);
    else setOpenMenu(menuName);
  };

  const closeAll = () => setOpenMenu(null);

  const fileMenu = [
    { label: 'New Text File', shortcut: 'Ctrl+N', action: () => setCreatingNode({ active: true, type: 'file', parentId: null }) },
    { label: 'New File...', shortcut: 'Ctrl+Alt+Windows+N', action: () => setCreatingNode({ active: true, type: 'file', parentId: null }) },
    { label: 'New Window', shortcut: 'Ctrl+Shift+N' },
    { separator: true },
    { label: 'Open File...', shortcut: 'Ctrl+O', action: openFile },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: openFolder },
    { label: 'Open Recent', submenu: true },
    { separator: true },
    { label: 'Save', shortcut: 'Ctrl+S' },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
    { label: 'Save All', shortcut: 'Ctrl+K S' },
    { separator: true },
    { label: 'Exit' }
  ];

  const editMenu = [
    { label: 'Undo', shortcut: 'Ctrl+Z' },
    { label: 'Redo', shortcut: 'Ctrl+Y' },
    { separator: true },
    { label: 'Cut', shortcut: 'Ctrl+X' },
    { label: 'Copy', shortcut: 'Ctrl+C' },
    { label: 'Paste', shortcut: 'Ctrl+V' },
    { separator: true },
    { label: 'Find', shortcut: 'Ctrl+F' },
    { label: 'Replace', shortcut: 'Ctrl+H' }
  ];

  const selectionMenu = [
    { label: 'Select All', shortcut: 'Ctrl+A' },
    { label: 'Expand Selection', shortcut: 'Shift+Alt+RightArrow' },
    { label: 'Shrink Selection', shortcut: 'Shift+Alt+LeftArrow' },
    { separator: true },
    { label: 'Copy Line Up', shortcut: 'Shift+Alt+UpArrow' },
    { label: 'Copy Line Down', shortcut: 'Shift+Alt+DownArrow' },
    { label: 'Move Line Up', shortcut: 'Alt+UpArrow' },
    { label: 'Move Line Down', shortcut: 'Alt+DownArrow' }
  ];

  const terminalMenu = [
    { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => setIsBottomPanelOpen(true) },
    { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
    { separator: true },
    { label: 'Run Active File', action: () => setIsBottomPanelOpen(true) }
  ];

  const viewMenu = [
    { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P' },
    { separator: true },
    { label: 'Appearance', submenu: true },
    { label: 'Editor Layout', submenu: true },
    { separator: true },
    { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => { setIsSidebarOpen(true); setActiveSidebarTab('explorer'); } },
    { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => { setIsSidebarOpen(true); setActiveSidebarTab('search'); } },
    { label: 'Output', action: () => { setIsBottomPanelOpen(true); setBottomPanelTab('output'); } },
    { label: 'Terminal', shortcut: 'Ctrl+`', action: () => { setIsBottomPanelOpen(true); setBottomPanelTab('terminal'); } }
  ];

  const runMenu = [
    { label: 'Start Debugging', shortcut: 'F5', action: runCode },
    { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: runCode },
    { label: 'Stop Debugging', shortcut: 'Shift+F5' },
    { separator: true },
    { label: 'Install Extensions', action: () => setActiveSidebarTab('extensions') }
  ];

  return (
    <>
      {/* Mobile Quick Action Header Bar */}
      <div className="flex md:hidden h-[40px] shrink-0 bg-[#1e1e1e] items-center justify-between px-2.5 border-b border-[#2d2d2d] select-none text-[13px] text-[#cccccc] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className={`p-1.5 rounded cursor-pointer ${isSidebarOpen ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}`}
            title="Toggle Sidebar"
          >
            <PanelLeft size={18} />
          </button>
          <Hexagon size={16} className="text-[#007acc] shrink-0" fill="#007acc" />
          <span className="font-semibold text-white truncate text-[13px]">
            {activeFile?.name || 'DevSync'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={runCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[12px] font-medium cursor-pointer"
            title="Run Code"
          >
            <Play size={13} fill="currentColor" />
            <span>Run</span>
          </button>
          <button
            onClick={() => {
              if (isBottomPanelOpen && bottomPanelTab === 'preview') {
                setIsBottomPanelOpen(false);
              } else {
                setBottomPanelTab('preview');
                setIsBottomPanelOpen(true);
              }
            }}
            className={`p-1.5 rounded cursor-pointer ${isBottomPanelOpen && bottomPanelTab === 'preview' ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}`}
            title="Live Preview"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => {
              if (isBottomPanelOpen && bottomPanelTab === 'terminal') {
                setIsBottomPanelOpen(false);
              } else {
                setBottomPanelTab('terminal');
                setIsBottomPanelOpen(true);
              }
            }}
            className={`p-1.5 rounded cursor-pointer ${isBottomPanelOpen && bottomPanelTab === 'terminal' ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}`}
            title="Toggle Terminal"
          >
            <TerminalIcon size={16} />
          </button>
        </div>
      </div>

      {/* Menu Bar (Desktop & Horizontally Scrollable on Mobile) */}
      <div className="title-bar flex h-[32px] md:h-[30px] bg-[#1e1e1e] items-center px-2 md:px-3 border-b border-[#2d2d2d] select-none text-[12px] md:text-[13px] text-[#cccccc] overflow-x-auto no-scrollbar whitespace-nowrap">
        <Hexagon size={16} className="hidden md:block text-[#007acc] mr-3 ml-1 shrink-0" fill="#007acc" />
        
        <DropdownMenu label="File" items={fileMenu} isOpen={openMenu === 'File'} onToggle={() => toggleMenu('File')} closeAll={closeAll} />
        <DropdownMenu label="Edit" items={editMenu} isOpen={openMenu === 'Edit'} onToggle={() => toggleMenu('Edit')} closeAll={closeAll} />
        <DropdownMenu label="Selection" items={selectionMenu} isOpen={openMenu === 'Selection'} onToggle={() => toggleMenu('Selection')} closeAll={closeAll} />
        <DropdownMenu label="View" items={viewMenu} isOpen={openMenu === 'View'} onToggle={() => toggleMenu('View')} closeAll={closeAll} />
        <div className="px-2 py-1 hover:bg-[#2a2d2e] rounded cursor-pointer transition-colors shrink-0" onClick={closeAll}>Go</div>
        <DropdownMenu label="Run" items={runMenu} isOpen={openMenu === 'Run'} onToggle={() => toggleMenu('Run')} closeAll={closeAll} />
        <DropdownMenu label="Terminal" items={terminalMenu} isOpen={openMenu === 'Terminal'} onToggle={() => toggleMenu('Terminal')} closeAll={closeAll} />
        <div className="px-2 py-1 hover:bg-[#2a2d2e] rounded cursor-pointer transition-colors shrink-0" onClick={closeAll}>Help</div>
      </div>
    </>
  );
};
