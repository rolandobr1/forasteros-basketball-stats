
import React, { useEffect, useRef, SVGProps, useCallback } from 'react';
import { NavLink } from 'react-router-dom';

interface MenuItemDef {
  path: string;
  label: string;
  icon: React.ReactNode;
  action?: () => void; // Optional action for non-navigation items
}

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItemDef[];
  triggerRef?: React.RefObject<HTMLElement>;
}

const DropdownMenu: React.FC<DropdownMenuProps> = React.memo(({ isOpen, onClose, menuItems, triggerRef }) => {
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

  const handleItemClick = useCallback(() => {
    setTimeout(onClose, 50); // Delay to allow NavLink/action to process
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-brand-surface rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
    >
      {menuItems.map((item) => {
        const itemIcon = React.cloneElement(item.icon as React.ReactElement<SVGProps<SVGSVGElement>>, { 
          className: `w-5 h-5 mr-3 flex-shrink-0 ${(item.icon as React.ReactElement<SVGProps<SVGSVGElement>>).props.className || ''}`
        });

        if (item.action) {
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.action) item.action();
                handleItemClick();
              }}
              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-brand-text-secondary dark:hover:bg-slate-700 dark:hover:text-brand-text-primary transition-colors block w-full text-left"
              role="menuitem"
            >
              {itemIcon}
              <span className="truncate">{item.label}</span>
            </button>
          );
        }
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleItemClick}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm ${
                isActive 
                  ? 'bg-brand-accent text-white' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-brand-text-secondary dark:hover:bg-slate-700 dark:hover:text-brand-text-primary'
              } transition-colors block w-full text-left`
            }
            role="menuitem"
          >
            {itemIcon}
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
});

export default DropdownMenu;
