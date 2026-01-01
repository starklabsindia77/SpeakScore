import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
    label: string;
    to: string;
    icon: React.ElementType;
}

interface SidebarProps {
    navItems: NavItem[];
    title?: string;
    subtitle?: string;
    logo?: React.ReactNode;
}

export function Sidebar({ navItems, title, subtitle, logo }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <aside
            className={`relative flex flex-col border-r bg-white/90 backdrop-blur transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            <div className={`flex items-center gap-2 border-b p-4 ${isCollapsed ? 'justify-center' : ''}`}>
                {logo}
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
                        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 ${isActive ? 'bg-slate-100 text-blue-700' : 'text-slate-700'
                            } ${isCollapsed ? 'justify-center' : ''}`
                        }
                        title={isCollapsed ? item.label : undefined}
                    >
                        <item.icon className={`h-5 w-5 flex-shrink-0`} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-white text-slate-500 shadow-sm hover:text-slate-700"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
}
