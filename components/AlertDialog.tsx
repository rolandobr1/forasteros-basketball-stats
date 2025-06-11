
import React from 'react';
import { AlertProps } from '../types';
import { XMarkIcon } from '../utils';

const AlertDialog: React.FC<AlertProps> = React.memo(({ isOpen, onClose, title, children, confirmText = "OK" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white"
            aria-label="Cerrar alerta"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="text-gray-600 dark:text-slate-300 mb-6">
          {children}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AlertDialog;
