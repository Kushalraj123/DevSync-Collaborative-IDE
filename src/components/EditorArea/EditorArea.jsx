import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { useEditor } from '../../context/EditorContext';
import { useCollaboration } from '../../context/CollaborationContext';
import { useAuth } from '../../context/AuthContext';
import { X, Play, FileCode } from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';
import { useIsMobile } from '../../hooks/useIsMobile';

export const EditorArea = () => {
  const isMobile = useIsMobile();
  const {
    activeFileId, openFileIds, openFileById, closeFile,
    files, handleEditorChange, runCode, awarenessUsers, username,
    editorSettings
  } = useEditor();
  
  const { ydoc, awareness } = useCollaboration();
  const { userRole } = useAuth();

  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const prevFileIdRef = useRef(null);

  const activeFile = files.find(f => f.id === activeFileId) || {
    id: 'none', name: 'No File', content: '', type: 'plaintext'
  };

  // The editor instance changes when activeFileId changes because of key={activeFileId}.
  // We initialize the Yjs binding when the specific editor instance mounts.
  
  // We use an effect just for cleanup on unmount of the entire component, 
  // but individual bindings are cleaned up when the editor remounts.
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, []);

  const getLanguage = (fileName) => {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', html: 'html', css: 'css', json: 'json',
      cpp: 'cpp', c: 'c', java: 'java', md: 'markdown', sh: 'shell'
    };
    return map[ext] || 'plaintext';
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    
    // Set readOnly based on role
    editor.updateOptions({ readOnly: userRole === 'viewer' });
    
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const yText = ydoc.getText(`file_content_${activeFileId}`);

    bindingRef.current = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      awareness
    );
  };

  return (
    <div
      className="editor-area flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Tabs Bar */}
      <div style={{ display: 'flex', background: '#252526', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #1e1e1e' }}>
        {openFileIds.map(fid => {
          const file = files.find(f => f.id === fid);
          if (!file) return null;
          const isActive = activeFileId === fid;

          return (
            <div
              key={fid}
              onClick={() => openFileById(fid)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: isMobile ? '6px 8px' : '6px 12px',
                minWidth: isMobile ? 96 : 120,
                maxWidth: isMobile ? 160 : 200,
                borderRight: '1px solid #1e1e1e',
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                background: isActive ? '#1e1e1e' : '#2d2d2d',
                color: isActive ? '#ffffff' : '#969696',
                fontSize: 13,
                userSelect: 'none',
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#007acc' }} />
              )}
              <span style={{ flexShrink: 0, display: 'flex' }}>{getFileIcon(file.name, false, false)}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {file.name}
              </span>
              <button
                onClick={(e) => closeFile(fid, e)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', padding: 2, borderRadius: 3, display: 'flex',
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#454545'; e.currentTarget.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.opacity = isActive ? 1 : 0; }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        <div style={{ flex: 1, background: '#252526' }} />
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 16px', fontSize: 12, color: '#858585', background: '#1e1e1e', flexShrink: 0 }}>
        <span style={{ cursor: 'pointer' }}>src</span>
        <span>&gt;</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          {getFileIcon(activeFile.name, false, false)}
          {activeFile.name}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <button onClick={runCode} title="Run Code" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#858585', display: 'flex' }}>
            <Play size={14} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activeFileId && activeFileId !== 'none' ? (
          <Editor
            key={activeFileId}
            height="100%"
            theme={editorSettings?.theme || 'vs-dark'}
            language={getLanguage(activeFile.name)}
            defaultValue={activeFile.content || ''}
            onMount={handleEditorMount}
            options={{
              fontSize: editorSettings?.fontSize ?? (isMobile ? 13 : 14),
              tabSize: editorSettings?.tabSize ?? 2,
              minimap: { enabled: !isMobile && (editorSettings?.minimap ?? true) },
              lineNumbersMinChars: isMobile ? 3 : 5,
              glyphMargin: !isMobile,
              folding: !isMobile,
              lineDecorationsWidth: isMobile ? 4 : 10,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 10 },
              cursorBlinking: editorSettings?.cursorBlinking || 'smooth',
              smoothScrolling: true,
              lineHeight: Math.round((editorSettings?.fontSize ?? 14) * 1.45),
              wordWrap: editorSettings?.wordWrap || 'on',
            }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2, userSelect: 'none', color: '#cccccc' }}>
            <FileCode size={100} strokeWidth={0.5} />
            <p style={{ marginTop: 16, fontSize: 20, fontWeight: 300 }}>Select a file to edit</p>
          </div>
        )}
      </div>
      {/* Per-user cursor colors matching LIVE SESSION member dots + hide cursors of viewers */}
      <style>
        {(() => {
          const rules = [];
          const myClientId = awareness?.clientID;
          const myUser = awarenessUsers?.find(
            (u) => (myClientId != null && u.clientId === myClientId) || u.name === username
          );
          if (myUser?.color) {
            rules.push(
              `.monaco-editor .cursors-layer .cursor { background-color: ${myUser.color} !important; border-color: ${myUser.color} !important; }`
            );
          }
          if (awarenessUsers) {
            awarenessUsers.forEach((u) => {
              if (u.role === 'viewer') {
                rules.push(
                  `.yRemoteSelection-${u.clientId}, .yRemoteSelectionHead-${u.clientId} { display: none !important; }`
                );
              } else if (u.color) {
                rules.push(
                  `.yRemoteSelection-${u.clientId} { background-color: color-mix(in srgb, ${u.color} 30%, transparent) !important; }`,
                  `.yRemoteSelectionHead-${u.clientId} { border-color: ${u.color} !important; }`,
                  `.yRemoteSelectionHead-${u.clientId}::after { border-color: ${u.color} !important; background-color: ${u.color} !important; }`
                );
              }
            });
          }
          return rules.join('\n');
        })()}
      </style>
    </div>
  );
};
