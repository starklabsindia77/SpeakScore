import React, { useState, useEffect, useRef } from 'react';

interface DropdownProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`absolute z-10 mt-2 w-48 rounded-lg bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${align === 'right' ? 'right-0' : 'left-0'
                        }`}
                >
                    <div className="flex flex-col gap-0.5" onClick={() => setIsOpen(false)}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ElementType;
    variant?: 'default' | 'danger';
}

export function DropdownItem({ children, icon: Icon, variant = 'default', className, ...props }: DropdownItemProps) {
    const baseStyles = "flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md transition-colors";
    const variantStyles = variant === 'danger'
        ? "text-red-600 hover:bg-red-50"
        : "text-slate-700 hover:bg-slate-50";

    return (
        <button className={`${baseStyles} ${variantStyles} ${className || ''}`} {...props}>
            {Icon && <Icon size={16} />}
            {children}
        </button>
    );
}
