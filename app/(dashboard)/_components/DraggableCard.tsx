"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function DraggableCard({
  id,
  title,
  children,
  isCollapsed,
  onToggleCollapse,
  className,
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50 z-50",
        className
      )}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b bg-card">
          <button
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <h3 className="font-semibold flex-1">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!isCollapsed && <div className="p-4">{children}</div>}
      </Card>
    </div>
  );
}
