'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { nodeApi } from '@/lib/api';
import { decrypt, encrypt } from '@/lib/crypto';
import { Loader2 } from 'lucide-react';

interface EditorProps {
    nodeId: number;
    title: string;
    onTitleChange?: (newTitle: string) => void;
}

export default function Editor({ nodeId, title, onTitleChange }: EditorProps) {
    const { masterKey } = useAuthStore();
    
    // UI State
    const [editableTitle, setEditableTitle] = useState(title);
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Internal Sync State
    const [serverBlockIds, setServerBlockIds] = useState<number[]>([]);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        setEditableTitle(title);
    }, [title]);

    // 1. Fetch & Decrypt
    const fetchContent = useCallback(async () => {
        if (!nodeId) return;
        setIsLoading(true);
        try {
            const response = await nodeApi.getNodeContents(nodeId);
            const ids: number[] = [];
            const contents: string[] = [];

            for (const item of response) {
                ids.push(item.nodeContentId);
                let decrypted = "";
                if (masterKey) {
                    try {
                        decrypted = await decrypt(item.encryptedContent, masterKey);
                    } catch (e) {
                        decrypted = "[Decryption Failed]";
                    }
                } else {
                    decrypted = item.encryptedContent;
                }
                contents.push(decrypted);
            }

            setServerBlockIds(ids);
            setContent(contents.join('\n'));
        } catch (err) {
            console.error("Failed to fetch node contents", err);
            setContent("");
            setServerBlockIds([]);
        } finally {
            setIsLoading(false);
        }
    }, [nodeId, masterKey]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    // 2. Auto-resize Textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [content, isLoading]);

    // 3. Save Logic (Syncing Single Textarea to Multiple Blocks)
    const saveChanges = async (currentTitle: string, currentContent: string) => {
        if (!masterKey) return;
        setIsSaving(true);
        try {
            // A. Title Update
            if (currentTitle !== title) {
                const encryptedTitle = await encrypt(currentTitle, masterKey);
                await nodeApi.updateNodeTitle(nodeId, { encryptedTitle });
                if (onTitleChange) onTitleChange(currentTitle);
            }

            // B. Content Sync
            const lines = currentContent.split('\n');
            const updates: { nodeContentId: number, encryptedContent: string }[] = [];
            const newContents: string[] = [];
            const idsToDelete: number[] = [];

            // Match lines to existing server blocks
            for (let i = 0; i < Math.max(lines.length, serverBlockIds.length); i++) {
                if (i < lines.length && i < serverBlockIds.length) {
                    // Update existing
                    updates.push({
                        nodeContentId: serverBlockIds[i],
                        encryptedContent: await encrypt(lines[i], masterKey)
                    });
                } else if (i < lines.length) {
                    // Add new
                    newContents.push(await encrypt(lines[i], masterKey));
                } else if (i < serverBlockIds.length) {
                    // Delete extra
                    idsToDelete.push(serverBlockIds[i]);
                }
            }

            // Execute API calls
            if (idsToDelete.length > 0) {
                await nodeApi.deleteNodeContents({ nodeContentIds: idsToDelete });
            }

            if (newContents.length > 0) {
                // For position, we just append since it's a fluid sync
                const lastExistingId = serverBlockIds.length > 0 ? serverBlockIds[serverBlockIds.length - 1] : null;
                const newIds = await nodeApi.addNodeContents(nodeId, { 
                    encryptedContents: newContents,
                    prevNodeContentId: lastExistingId
                });
                
                // Update local IDs to prevent multiple additions
                const addedIds = newIds.map(n => n.nodeContentId);
                setServerBlockIds(prev => [...prev.slice(0, lines.length - newContents.length), ...addedIds]);
            }

            if (updates.length > 0) {
                await nodeApi.updateNodeContents({ requests: updates });
            }

            // Update serverBlockIds after deletions
            if (idsToDelete.length > 0) {
                setServerBlockIds(prev => prev.slice(0, lines.length));
            }

        } catch (err) {
            console.error("Failed to auto-save:", err);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (isLoading) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(() => {
            saveChanges(editableTitle, content);
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [editableTitle, content, isLoading]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#666]" size={32} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-[45px] flex items-center justify-between px-4 border-b border-[#EDEDEB]">
                <div className="flex items-center gap-2 text-sm text-[#37352F]">
                    <span className="text-[#666]">Workspace</span>
                    <span className="text-[#666]">/</span>
                    <span className="font-medium truncate max-w-[200px]">{editableTitle}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#666]">
                    {isSaving ? (
                        <div className="flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />
                            <span>Saving...</span>
                        </div>
                    ) : (
                        <span>Saved</span>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-white px-6 md:px-[100px] py-10 md:py-20">
                <div className="max-w-full md:max-w-[700px] mx-auto">
                    <input 
                        className="w-full text-3xl md:text-[40px] font-bold mb-6 md:mb-8 text-[#37352F] border-none outline-none placeholder-[#D3D1CB] bg-transparent"
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        placeholder="Untitled"
                    />
                    
                    <textarea
                        ref={textareaRef}
                        className="w-full resize-none bg-transparent border-none outline-none text-[15px] md:text-[16px] leading-[1.6] text-[#37352F] placeholder-[#D3D1CB] min-h-[500px] py-1 overflow-hidden"
                        placeholder="Start writing..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
