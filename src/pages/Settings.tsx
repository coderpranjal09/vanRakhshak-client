import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 glass border-b border-forest-accent/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-forest-primary" />
          <div>
            <h1 className="text-xl font-bold text-forest-primary">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure your dashboard preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="border-forest-primary text-forest-primary hover:bg-forest-primary hover:text-white">
            Main Site
          </Button>
          <Button size="sm" className="bg-forest-primary text-white hover:bg-forest-primary/90">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="glass-card p-6 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-forest-primary mb-4">Settings Coming Soon</h2>
          <p className="text-muted-foreground">This feature will be available in the next update.</p>
        </div>
      </main>
    </div>
  );
};

export default Settings;