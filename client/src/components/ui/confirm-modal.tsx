import React from 'react';
import { cn } from '@/lib/utils/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (e?: React.FormEvent) => void | Promise<void>;
    title: string;
    message: React.ReactNode;
    type?: 'default' | 'warning' | 'danger';
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'default',
    confirmText = '确认',
    cancelText = '取消',
    isLoading = false,
}) => {
    // 根据类型确定样式
    const typeConfig = {
        default: {
            titleClass: 'text-neutral-900 dark:text-neutral-100',
            confirmClass: 'bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200',
        },
        warning: {
            titleClass: 'text-neutral-900 dark:text-neutral-100',
            confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700',
        },
        danger: {
            titleClass: 'text-neutral-900 dark:text-neutral-100',
            confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white',
        },
    };

    const config = typeConfig[type];

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(e);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <div className="px-8 py-10">
                    <DialogHeader className="space-y-5">
                        <DialogTitle className={cn(
                            "text-2xl font-bold tracking-tight leading-none",
                            config.titleClass
                        )}>
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-base font-normal text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {message}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <DialogFooter className="px-8 py-5 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200/50 dark:border-neutral-700/50">
                    <div className="flex justify-between w-full">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="h-10 px-5 text-sm font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600"
                            disabled={isLoading}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleConfirm}
                            className={cn(
                                "h-10 px-5 text-sm font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600",
                                config.confirmClass
                            )}
                            loading={isLoading}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmModal;