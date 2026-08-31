/**
 * mobile/hooks/useLiveUpdates.ts
 *
 * Replaces the WebSocket-based live updates with Supabase Realtime.
 * Listens to INSERT events on meal_scans and glucose_readings for the
 * current user, then invalidates React Query caches so the dashboard
 * and history screens refresh automatically.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useLiveStore } from '../store/liveStore';

export function useLiveUpdates() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const setSeverity = useLiveStore(s => s.setSeverity);

  useEffect(() => {
    if (!user?.id) return;

    const mealTopic = `meal_scans_${user.id}`;
    const glucoseTopic = `glucose_readings_${user.id}`;

    // Defensively clear any stale channel still registered under the same
    // topic (handles remounts / Fast Refresh / Strict Mode double-invoke —
    // Supabase throws if you .on() a channel that's already subscribed).
    supabase.getChannels()
      .filter(ch => (ch as any).topic.endsWith(mealTopic) || (ch as any).topic.endsWith(glucoseTopic))
      .forEach(ch => supabase.removeChannel(ch));

    // Subscribe to meal_scans INSERTs for this user
    const mealChannel = supabase
      .channel(mealTopic)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'meal_scans',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] New meal scan:', payload.new);

          // Check risk level for severity indicator
          const risk = (payload.new as any).risk_level;
          if (risk === 'high' || risk === 'critical') {
            setSeverity('critical');
          } else if (risk === 'moderate') {
            setSeverity('warning');
          } else {
            setSeverity('normal');
          }

          // Invalidate dashboard + history caches → triggers re-fetch
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['scans'] });
          queryClient.invalidateQueries({ queryKey: ['meals'] });
        }
      )
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[Realtime] mealChannel subscribe non-SUBSCRIBED status:', status, err);
        }
      });

    // Subscribe to glucose_readings INSERTs for this user
    const glucoseChannel = supabase
      .channel(glucoseTopic)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'glucose_readings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] New glucose reading:', payload.new);

          // Evaluate urgency
          const mg = (payload.new as any).glucose_value_mg_dl;
          if (mg < 55 || mg > 250) {
            setSeverity('critical');
          } else if (mg < 70 || mg > 180) {
            setSeverity('warning');
          } else {
            setSeverity('normal');
          }

          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['glucose'] });
        }
      )
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[Realtime] glucoseChannel subscribe non-SUBSCRIBED status:', status, err);
        }
      });

    return () => {
      supabase.removeChannel(mealChannel);
      supabase.removeChannel(glucoseChannel);
    };
  }, [user?.id, queryClient, setSeverity]);
}
