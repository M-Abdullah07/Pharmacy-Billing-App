import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = setTimeout(handleClose, 3300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  return (
    <div
      data-mounted={mounted}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
      transition-[transform,opacity] ease-[var(--ease-out-strong)]
      ${closing ? 'duration-200 opacity-0 translate-y-2' : 'duration-[250ms]'}
      ${mounted && !closing ? 'opacity-100 translate-y-0' : ''}
      ${!mounted && !closing ? 'opacity-0 translate-y-4' : ''}
      ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}
    >
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={handleClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
