import React from 'react';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    horizontalListSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

export interface AtlasWorkspaceTab {
    id: string;
    label: string;
    icon: React.ElementType;
    accent?: string;
}

interface SortableWorkspaceTabProps {
    tab: AtlasWorkspaceTab;
    isActive: boolean;
    canClose: boolean;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
}

const SortableWorkspaceTab = ({ tab, isActive, canClose, onActivate, onClose }: SortableWorkspaceTabProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
    const Icon = tab.icon;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`group flex h-9 shrink-0 items-center rounded-lg border transition-colors ${isActive
                ? 'border-teal-300/30 bg-teal-400/10 text-white'
                : 'border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:text-slate-200'
                } ${isDragging ? 'z-20 opacity-70 shadow-2xl' : ''}`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={`Move ${tab.label} tab`}
                title={`Drag ${tab.label}`}
                className="flex h-full w-7 shrink-0 touch-none items-center justify-center rounded-l-lg text-slate-600 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60"
            >
                <GripVertical size={13} />
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onActivate(tab.id)}
                className="flex h-full min-w-0 items-center gap-2 px-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60"
            >
                <Icon size={14} style={{ color: isActive ? tab.accent : undefined }} />
                <span className="max-w-32 truncate">{tab.label}</span>
            </button>
            {canClose && (
                <button
                    type="button"
                    onClick={() => onClose(tab.id)}
                    aria-label={`Close ${tab.label} tab`}
                    title={`Close ${tab.label}`}
                    className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                >
                    <X size={13} />
                </button>
            )}
        </div>
    );
};

interface AtlasWorkspaceTabsProps {
    tabs: AtlasWorkspaceTab[];
    activeId: string;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
    onReorder: (activeId: string, overId: string) => void;
}

export const AtlasWorkspaceTabs = ({ tabs, activeId, onActivate, onClose, onReorder }: AtlasWorkspaceTabsProps) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        onReorder(String(active.id), String(over.id));
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tabs.map(tab => tab.id)} strategy={horizontalListSortingStrategy}>
                <div className="custom-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1" role="tablist" aria-label="Open workspace modules">
                    {tabs.map(tab => (
                        <SortableWorkspaceTab
                            key={tab.id}
                            tab={tab}
                            isActive={tab.id === activeId}
                            canClose={tabs.length > 1}
                            onActivate={onActivate}
                            onClose={onClose}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
