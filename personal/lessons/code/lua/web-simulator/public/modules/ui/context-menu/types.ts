export type MenuCallbacks = {
    onTransform: (mode: string) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onShowCoords?: () => void;
    onResetOrigin?: () => void;
    objectInfoTitle?: string;
    objectInfoItems?: { title?: string; text: string }[];
    objectActionsTitle?: string;
    objectActions?: { label: string; icon: string; action: () => void; active?: boolean; danger?: boolean }[];
};
