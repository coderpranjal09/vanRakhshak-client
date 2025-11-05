import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  Home, 
  Radar, 
  TreePine, 
  FileText, 
  Settings,
  Shield
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
  },
  {
    title: 'Sensor Status',
    url: '/sensors',
    icon: Radar,
  },
  {
    title: 'Live Monitoring',
    url: '/monitoring',
    icon: TreePine,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileText,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-forest-primary/20 text-forest-primary font-medium border-r-2 border-forest-primary' 
      : 'hover:bg-forest-accent/30 text-foreground hover:text-forest-primary';

  return (
    <Sidebar
      className={`${collapsed ? 'w-14' : 'w-60'} glass border-r border-forest-accent/30`}
      collapsible="icon"
    >
<SidebarHeader className="p-4 border-b border-forest-accent/30">
  {!collapsed && (
    <div className="flex items-center gap-2">
      {/* Logo image */}
      <img 
        src="https://github.com/dimriutkarsh/van-dash/blob/main/src/logo.jpg?raw=true" 
        alt="VanRakshak Logo" 
        className="w-8 h-8 rounded-lg object-cover" 
      />

      <div>
        <h2 className="font-bold text-forest-primary">VanRakshak</h2>
        <p className="text-xs text-muted-foreground">Forest Department Dashboard</p>
      </div>
    </div>
  )}
  {collapsed && (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto">
      <img 
        src="/logo.jpg" 
        alt="VanRakshak Logo" 
        className="w-8 h-8 rounded-lg object-cover" 
      />
    </div>
  )}
</SidebarHeader>


      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : 'text-forest-primary'}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
