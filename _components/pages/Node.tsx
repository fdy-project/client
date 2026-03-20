import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/_components/Sidebar';
import Editor from '@/_components/Editor';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { logger } from '@/utils/logger';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 260;

interface NodeProps {
    onNavigate: (page: string) => void;
}

export function Node({ onNavigate }: NodeProps) {
    const { accessToken, masterKey, isInitialized } = useAuthStore();
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
    const [selectedNodeTitle, setSelectedNodeTitle] = useState<string>("");
    const [selectedNodeType, setSelectedNodeType] = useState<string>("");
    const [sidebarKey, setSidebarKey] = useState(0);

    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Automatically hide sidebar on narrow screens (like extension popup)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 600) {
            setIsSidebarVisible(false);
        }
    }, []);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            let newWidth = e.clientX;
            if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
            if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
            setSidebarWidth(newWidth);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    useEffect(() => {
        // Double check to prevent race conditions during hydration/initialization.
        // If we are initialized but no masterKey, wait briefly to be absolutely sure.
        let timeout: any;
        if (isInitialized && !masterKey) {
            timeout = setTimeout(() => {
                // Check again inside timeout
                if (!useAuthStore.getState().masterKey) {
                    logger.log("🔒 [Node] No MasterKey found after init, redirecting...");
                    onNavigate('login');
                }
            }, 100); // 100ms should be enough for any state settling
        }
        return () => clearTimeout(timeout);
    }, [masterKey, isInitialized, onNavigate]);

    if (!isInitialized) return null;
    if (!masterKey) return null;
    // Note: We allow rendering even if accessToken is null, 
    // components like Sidebar will handle their own error states.

    return (
        <div className="flex h-screen bg-white text-[#1A1A1A] font-sans overflow-hidden group">
            <div 
                ref={sidebarRef}
                style={{ width: isSidebarVisible ? `${sidebarWidth}px` : '0px' }}
                className={`relative flex flex-col bg-[#F7F7F5] transition-[width] duration-300 ease-in-out overflow-hidden`}
            >
                <div className="min-w-[200px] h-full flex flex-col">
                    <Sidebar 
                        key={sidebarKey}
                        onSelectNode={(id, title, type) => {
                            setSelectedNodeId(id);
                            setSelectedNodeTitle(title);
                            setSelectedNodeType(type);
                        }} 
                        onNavigate={onNavigate}
                        selectedNodeId={selectedNodeId}
                    />
                </div>
                {isSidebarVisible && (
                    <div
                        onMouseDown={startResizing}
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/30 active:bg-blue-500/50 transition-colors z-10"
                    />
                )}
            </div>

            <main className="flex-1 flex flex-col min-w-0 relative">
                <button
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    className={`absolute top-[60px] left-4 z-20 p-1.5 rounded-md text-[#666] hover:bg-[#EDEDEB] transition-all duration-300 ${
                        isSidebarVisible ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    }`}
                >
                    {isSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={20} />}
                </button>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedNodeId ? (
                        selectedNodeType === 'FILE' ? (
                            <Editor 
                                nodeId={selectedNodeId} 
                                title={selectedNodeTitle} 
                                onTitleChange={(newTitle) => {
                                    setSelectedNodeTitle(newTitle);
                                    setSidebarKey(prev => prev + 1);
                                }}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-[#666]">
                                <h2 className="text-2xl font-semibold mb-2 text-[#37352F]">{selectedNodeTitle}</h2>
                                <p className="text-sm">This is a folder. Select a file inside or create one to start writing.</p>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[#666]">
                            <h1 className="text-[40px] font-bold mb-4 text-[#37352F]">Welcome to FDY Write</h1>
                            <p className="text-lg text-center px-4">
                                Select a node from the sidebar to start writing securely.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
