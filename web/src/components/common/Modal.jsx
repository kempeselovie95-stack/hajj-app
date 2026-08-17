import { useEffect } from 'react';

/**
 * Modal minimale mais correcte : fermeture au clic sur l'overlay et à
 * Echap, focus géré par le navigateur sur le premier champ du contenu.
 * Pas de portail React (createPortal) pour rester simple — suffisant
 * tant que l'app n'empile pas plusieurs modales.
 */
export default function Modal({ title, isOpen, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,36,31,0.4)] px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-elevated"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="font-display text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-text-secondary hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
