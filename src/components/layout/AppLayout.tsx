import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export function AppLayout() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 glass border-b border-border/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Welcome back,</span>
            <span className="font-medium text-foreground">{user?.email}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="uppercase text-xs">
              {role}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
