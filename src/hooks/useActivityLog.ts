import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = async ({ action, entityType, entityId, details }: LogActivityParams) => {
    if (!user) return;

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_email: user.email || 'unknown',
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  return { logActivity };
}
