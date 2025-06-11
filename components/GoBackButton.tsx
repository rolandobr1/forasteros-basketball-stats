
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '../utils';

const GoBackButton: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <button
      onClick={handleGoBack}
      className="flex items-center text-gray-700 dark:text-white p-2 rounded-full bg-white dark:bg-brand-surface shadow-md hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent"
      aria-label="Volver a la página anterior"
    >
      <ChevronLeftIcon className="w-5 h-5 mr-1" />
    </button>
  );
};

export default GoBackButton;
