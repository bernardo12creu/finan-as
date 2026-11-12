import React, { useEffect } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 'calc(100% - max(env(safe-area-inset-top, 0px), 12px) - 10px)',
}) => {
  const dragControls = useDragControls();

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.85 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 480) {
                onClose();
              }
            }}
            style={{ maxHeight }}
            className="relative z-10 w-full max-w-md rounded-t-[28px] bg-[#141416]/95 backdrop-blur-2xl border-t border-x border-white/[0.09] shadow-2xl flex flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
          >
            {/* Drag Handle Indicator + Interactive Header Zone */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="touch-none cursor-grab active:cursor-grabbing shrink-0"
            >
              <div className="w-full flex items-center justify-center pt-3 pb-1.5">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {title ? (
                <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/[0.06]">
                  <h3 className="text-base font-bold tracking-tight text-[var(--text)]">{title}</h3>
                  <button
                    type="button"
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-8 h-8 flex items-center justify-center -mr-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full bg-[var(--surface-2)]/80 active:scale-90 transition-transform"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto ios-scroll px-6 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
