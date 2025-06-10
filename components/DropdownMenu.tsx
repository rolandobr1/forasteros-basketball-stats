
import React, { useEffect, useRef, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';

type Theme = 'light' | 'dark';

interface MenuItem {
  path?: string; // Optional for non-navigation items like theme toggle
  label: string;
  icon: React.ReactNode;
  action?: () => void; // For items that perform an action instead of navigating
  isThemeToggle?: boolean; // To identify the theme toggle item
}

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  triggerRef?: React.RefObject<HTMLElement>;
  currentTheme: Theme; // Receive current theme
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ isOpen, onClose, menuItems, triggerRef, currentTheme }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        (!triggerRef || (triggerRef.current && !triggerRef.current.contains(event.target as Node)))
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-56 bg-brand-surface-light dark:bg-brand-surface rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
    >
      {menuItems.map((item) => {
        if (item.action) { // Handle items with actions (like theme toggle)
          return (
            <button
              key={item.label}
              onClick={() => {
                item.action!(); // Perform the action
                // Optionally close menu, but for theme toggle, it might be better to keep it open to see change
                // onClose(); 
              }}
              className="flex items-center px-4 py-3 text-sm text-brand-text-primary-light dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-text-primary-light dark:hover:text-white transition-colors block w-full text-left"
              role="menuitem"
            >
              {React.cloneElement(item.icon as React.ReactElement<SVGProps<SVGSVGElement>>, { className: "w-5 h-5 mr-3 flex-shrink-0" })}
              <span className="truncate">{item.label}</span>
            </button>
          );
        }
        // Handle navigation items
        return (
          <NavLink
            key={item.path}
            to={item.path!} // Path is guaranteed for NavLink
            onClick={() => {
              setTimeout(onClose, 50); 
            }}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm ${
                isActive ? 
                (item.path === "/" ? 'bg-red-600 dark:bg-red-700 text-white' : 'bg-brand-accent-light dark:bg-brand-accent text-white') : 
                'text-brand-text-secondary-light dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-text-primary-light dark:hover:text-white'
              } transition-colors block w-full text-left`
            }
            role="menuitem"
          >
            {React.cloneElement(item.icon as React.ReactElement<SVGProps<SVGSVGElement>>, { className: "w-5 h-5 mr-3 flex-shrink-0" })}
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default DropdownMenu;
