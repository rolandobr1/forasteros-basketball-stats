
import React from 'react';

const LoadingSpinner: React.FC<{ size?: string }> = ({ size = 'w-8 h-8' }) => {
  return (
    <div 
      className={`animate-spin rounded-full border-4 border-t-brand-accent border-gray-300 dark:border-slate-500 ${size}`} 
      role="status"
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

export default LoadingSpinner;
