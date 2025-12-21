import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { motion } from 'framer-motion';

export function AppLayout() {
  const { user, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="h-14 sm:h-16 glass border-b border-border/50 flex items-center justify-between px-3 sm:px-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden shrink-0" 
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground hidden xs:inline">Welcome,</span>
            <span className="font-medium text-sm sm:text-base text-foreground truncate max-w-[120px] sm:max-w-none">{user?.email}</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="uppercase text-[10px] sm:text-xs">
              {role}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-border/50 bg-card/50 backdrop-blur-sm px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Auto Parts Management System. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-foreground transition-colors cursor-pointer">Support</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
