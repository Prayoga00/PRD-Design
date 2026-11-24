'use client';

import React, { useEffect, useRef } from 'react';

interface NativeModalProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Accessible native <dialog> modal wrapper with top-layer showModal(),
 * Esc handling, and cross-browser light-dismiss fallback (Safari).
 */
export function NativeModal({
  open,
  onClose,
  titleId,
  className = '',
  children,
}: NativeModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('close', handleClose);

    // Progressive fallback for browsers lacking <dialog closedby="any">
    let removeLightDismiss: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      removeLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      removeLightDismiss?.();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className={`m-auto w-[min(92vw,880px)] max-h-[88dvh] rounded-2xl border border-white/[0.1] bg-[#151518] p-0 text-white shadow-2xl open:flex open:flex-col ${className}`}
    >
      {children}
    </dialog>
  );
}
