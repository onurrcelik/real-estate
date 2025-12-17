'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Plus, Clock, History, ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Generation {
    id: string;
    created_at: string;
    style: string;
    original_image: string;
    generated_image: string;
}

interface SidebarProps {
    onSelectGeneration: (gen: Generation) => void;
    onNewChat: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function Sidebar({ onSelectGeneration, onNewChat, isOpen, setIsOpen }: SidebarProps) {
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('real-estate-generations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGenerations(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();

        // Subscribe to new changes
        const channel = supabase
            .channel('real-time-generations')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'real-estate-generations' }, (payload) => {
                setGenerations((prev) => [payload.new as Generation, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent selecting the item
        if (!confirm('Are you sure you want to delete this design?')) return;

        try {
            const { error } = await supabase
                .from('real-estate-generations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setGenerations((prev) => prev.filter((g) => g.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Failed to delete');
        }
    };

    return (
        <>
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:shadow-none flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="p-4 border-b">
                    <Button
                        onClick={onNewChat}
                        className="w-full justify-start gap-2 bg-muted/50 hover:bg-muted text-foreground border-0 shadow-none"
                        variant="outline"
                    >
                        <Plus className="w-4 h-4" />
                        New Design
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Recent</div>
                    {loading ? (
                        <div className="text-sm text-center py-4 text-muted-foreground">Loading history...</div>
                    ) : generations.length === 0 ? (
                        <div className="text-sm text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                            <History className="w-8 h-8 opacity-20" />
                            <p>No designs yet</p>
                        </div>
                    ) : (
                        generations.map((gen) => (
                            <div
                                key={gen.id}
                                onClick={() => {
                                    onSelectGeneration(gen);
                                    if (window.innerWidth < 768) setIsOpen(false); // Close on mobile select
                                }}
                                className="w-full p-2 rounded-lg hover:bg-muted/50 transition-colors group flex items-start gap-3 cursor-pointer relative pr-8"
                            >
                                <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0 mt-0.5">
                                    <img src={gen.original_image} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                                        {gen.style || 'Design'}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {new Date(gen.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, gen.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
