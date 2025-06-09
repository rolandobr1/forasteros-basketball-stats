
import React, { useEffect, useRef, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  triggerRef?: React.RefObject<HTMLElement>; // Optional: ref of the trigger button
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ isOpen, onClose, menuItems, triggerRef }) => {
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
      className="absolute top-full right-0 mt-2 w-56 bg-brand-surface rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
    >
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => {
            setTimeout(onClose, 50); 
          }}
          className={({ isActive }) =>
            `flex items-center px-4 py-3 text-sm ${
              isActive ? 'bg-brand-accent text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            } transition-colors block w-full text-left`
          }
          role="menuitem"
        >
          {React.cloneElement(item.icon as React.ReactElement<SVGProps<SVGSVGElement>>, { className: "w-5 h-5 mr-3 flex-shrink-0" })}
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default DropdownMenu;
