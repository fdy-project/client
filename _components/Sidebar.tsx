'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { nodeApi } from '@/lib/api';
import { decrypt, encrypt } from '@/lib/crypto';
import { LogOut, FileText, Folder, Plus, Loader2, Trash2, Shield, Pencil } from 'lucide-react';

interface SidebarProps {
    onSelectNode: (id: number, title: string, type: string) => void;
    onNavigate: (page: string) => void;
    selectedNodeId: number | null;
}

interface Node {
    nodeId: number;
    title: string;
    encryptedTitle: string;
    nodeType: 'FILE' | 'FOLDER';
    nodeParentId: number | null;
    depth?: number;
    children?: Node[];
}

export default function Sidebar({ onSelectNode, onNavigate, selectedNodeId }: SidebarProps) {
    const { clearAuth, masterKey } = useAuthStore();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: number, type: 'INTO' | 'BEFORE' | 'AFTER' } | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: Node } | null>(null);
    
    // Rename State
    const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    const fetchNodes = async () => {
        try {
            const rawNodes = await nodeApi.getNodesTree();
            const decryptedNodes = await Promise.all(rawNodes.map(async (node: any) => {
                let title = node.encryptedTitle;
                if (masterKey) {
                    try {
                        title = await decrypt(node.encryptedTitle, masterKey);
                    } catch (e) {
                        title = "[Decryption Failed]";
                    }
                }
                return { ...node, title };
            }));

            const tree = buildTree(decryptedNodes);
            setNodes(tree);
        } catch (err) {
            console.error("Failed to fetch nodes", err);
        } finally {
            setIsLoading(false);
        }
    };

    const buildTree = (flatNodes: any[]): Node[] => {
        const map: Record<number, Node> = {};
        const roots: Node[] = [];

        flatNodes.forEach(node => {
            map[node.nodeId] = { ...node, children: [] };
        });

        flatNodes.forEach(node => {
            if (node.nodeParentId && map[node.nodeParentId]) {
                map[node.nodeParentId].children?.push(map[node.nodeId]);
            } else {
                roots.push(map[node.nodeId]);
            }
        });

        const addDepth = (nodes: Node[], depth: number) => {
            nodes.forEach(n => {
                n.depth = depth;
                if (n.children) addDepth(n.children, depth + 1);
            });
        };
        addDepth(roots, 0);

        return roots;
    };

    useEffect(() => {
        fetchNodes();
    }, [masterKey]);

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (editingNodeId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingNodeId]);

    const handleAddNode = async (type: 'FILE' | 'FOLDER') => {
        if (!masterKey) return;
        try {
            const encryptedTitle = await encrypt(type === 'FILE' ? "New Page" : "New Folder", masterKey);
            await nodeApi.addNode({ encryptedTitle, nodeType: type, parentNodeId: null });
            await fetchNodes();
        } catch (err) {
            console.error("Failed to add node", err);
        }
    };

    const handleDeleteNode = async (e: React.MouseEvent | null, nodeId: number) => {
        if (e) e.stopPropagation();
        if (!confirm("Delete this?")) return;
        try {
            await nodeApi.deleteNode(nodeId);
            await fetchNodes();
            if (selectedNodeId === nodeId) onSelectNode(0, "", "");
        } catch (err) {
            console.error("Failed to delete node", err);
        }
    };

    const handleRenameNode = async () => {
        if (!editingNodeId || !masterKey) return;
        const trimmedTitle = editTitle.trim();
        if (!trimmedTitle) {
            setEditingNodeId(null);
            return;
        }

        try {
            const encryptedTitle = await encrypt(trimmedTitle, masterKey);
            await nodeApi.updateNodeTitle(editingNodeId, { encryptedTitle });
            
            // If the renamed node is currently selected, update the parent state
            if (selectedNodeId === editingNodeId) {
                // Find the node to get its type
                const findNode = (nodesList: Node[]): Node | undefined => {
                    for (const node of nodesList) {
                        if (node.nodeId === editingNodeId) return node;
                        if (node.children) {
                            const found = findNode(node.children);
                            if (found) return found;
                        }
                    }
                };
                const node = findNode(nodes);
                if (node) {
                    onSelectNode(editingNodeId, trimmedTitle, node.nodeType);
                }
            }

            await fetchNodes();
        } catch (err) {
            console.error("Failed to rename node", err);
        } finally {
            setEditingNodeId(null);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, node: Node) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            node
        });
    };

    const startRenaming = (node: Node) => {
        setEditingNodeId(node.nodeId);
        setEditTitle(node.title);
        setContextMenu(null);
    };

    const handleDragStart = (e: React.DragEvent, nodeId: number) => {
        setDraggedNodeId(nodeId);
        e.dataTransfer.setData('nodeId', nodeId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetNode: Node) => {
        e.preventDefault();
        if (draggedNodeId === targetNode.nodeId) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const threshold = rect.height / 3;

        let type: 'INTO' | 'BEFORE' | 'AFTER' = 'INTO';
        if (y < threshold) type = 'BEFORE';
        else if (y > rect.height - threshold) type = 'AFTER';

        if (type === 'INTO' && (targetNode.nodeType !== 'FOLDER' || (targetNode.depth || 0) >= 5)) {
            type = y < rect.height / 2 ? 'BEFORE' : 'AFTER';
        }

        setDropTarget({ id: targetNode.nodeId, type });
    };

    const handleDrop = async (e: React.DragEvent, targetNode: Node) => {
        e.preventDefault();
        if (!draggedNodeId || draggedNodeId === targetNode.nodeId || !dropTarget) return;

        try {
            let parentId: number | null = null;
            let prevId: number | null = null;
            let nextId: number | null = null;

            if (dropTarget.type === 'INTO') {
                parentId = targetNode.nodeId;
                prevId = targetNode.children && targetNode.children.length > 0 
                    ? targetNode.children[targetNode.children.length - 1].nodeId 
                    : null;
            } else if (dropTarget.type === 'BEFORE') {
                parentId = targetNode.nodeParentId;
                nextId = targetNode.nodeId;
            } else {
                parentId = targetNode.nodeParentId;
                prevId = targetNode.nodeId;
            }

            await nodeApi.moveNode(draggedNodeId, {
                parentNodeId: parentId,
                prevNodeId: prevId,
                nextNodeId: nextId
            });
            await fetchNodes();
        } catch (err) {
            console.error("Failed to move node:", err);
        } finally {
            setDraggedNodeId(null);
            setDropTarget(null);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure you want to delete your account? This action is permanent and all your data will be lost.")) return;
        try {
            const { deleteAccount } = useAuthStore.getState();
            await deleteAccount();
            onNavigate('login');
        } catch (err) {
            alert("Failed to delete account. Please try again.");
            console.error(err);
        }
    };

    const renderNodes = (nodesToRender: Node[]) => {
        return nodesToRender.map(node => (
            <div key={node.nodeId}>
                <div 
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.nodeId)}
                    onDragOver={(e) => handleDragOver(e, node)}
                    onDrop={(e) => handleDrop(e, node)}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                    onClick={() => {
                        if (editingNodeId !== node.nodeId) {
                            onSelectNode(node.nodeId, node.title, node.nodeType);
                        }
                    }}
                    className={`group flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-[#37352F] text-sm transition-all border-y border-transparent ${
                        selectedNodeId === node.nodeId ? 'bg-[#EDEDEB]' : 'hover:bg-[#EDEDEB]'
                    } ${
                        dropTarget?.id === node.nodeId ? (
                            dropTarget.type === 'INTO' ? 'bg-blue-50 border-blue-200' :
                            dropTarget.type === 'BEFORE' ? 'border-t-blue-500' : 'border-b-blue-500'
                        ) : ''
                    }`}
                    style={{ paddingLeft: `${(node.depth || 0) * 12 + 8}px` }}
                >
                    <div className="text-[#666]">
                        {node.nodeType === 'FOLDER' ? <Folder size={16} /> : <FileText size={16} />}
                    </div>
                    {editingNodeId === node.nodeId ? (
                        <input
                            ref={editInputRef}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleRenameNode}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameNode();
                                if (e.key === 'Escape') setEditingNodeId(null);
                            }}
                            className="flex-1 bg-white border border-blue-500 rounded px-1 outline-none text-sm"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate flex-1">{node.title}</span>
                    )}
                    <button onClick={(e) => handleDeleteNode(e, node.nodeId)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded">
                        <Trash2 size={12} />
                    </button>
                </div>
                {node.children && node.children.length > 0 && renderNodes(node.children)}
            </div>
        ));
    };

    return (
        <aside className="h-full bg-[#F7F7F5] border-r border-[#EDEDEB] flex flex-col overflow-hidden relative">
            <div className="px-3 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#EDEDEB]">
                    <div className="w-6 h-6 bg-white border border-[#EDEDEB] rounded flex justify-center items-center overflow-hidden">
                        <Shield size={16} className="text-neutral-900" />
                    </div>
                    <span className="text-sm font-semibold truncate">My Workspace</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 pb-4">
                <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-bold text-[#666] uppercase">Workspace</span>
                    <div className="flex gap-1">
                        <button onClick={() => handleAddNode('FOLDER')} className="p-1 hover:bg-[#EDEDEB] rounded" title="Add Folder"><Folder size={14} /></button>
                        <button onClick={() => handleAddNode('FILE')} className="p-1 hover:bg-[#EDEDEB] rounded" title="Add Page"><Plus size={14} /></button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-[#666]" /></div>
                ) : renderNodes(nodes)}
            </div>

            <div className="p-2 border-t border-[#EDEDEB] space-y-1">
                <button onClick={() => { clearAuth(); onNavigate('login'); }} className="w-full flex items-center gap-2 p-2 text-[#666] text-sm hover:bg-[#EDEDEB] rounded-md">
                    <LogOut size={16} /> <span>Log out</span>
                </button>
                <button onClick={handleDeleteAccount} className="w-full flex items-center gap-2 p-2 text-red-500 text-sm hover:bg-red-50 rounded-md">
                    <Trash2 size={16} /> <span>Delete Account</span>
                </button>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => startRenaming(contextMenu.node)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        <Pencil size={14} /> Rename
                    </button>
                    <button 
                        onClick={() => handleDeleteNode(null, contextMenu.node.nodeId)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </aside>
    );
}
