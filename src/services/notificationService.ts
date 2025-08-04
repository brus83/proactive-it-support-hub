import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  ticket_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  data: any;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  new_ticket_in_app: boolean;
  new_ticket_email: boolean;
  escalation_in_app: boolean;
  escalation_email: boolean;
  deadline_in_app: boolean;
  deadline_email: boolean;
  reminder_in_app: boolean;
  reminder_email: boolean;
  email_frequency: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface TicketReminder {
  id: string;
  ticket_id: string;
  user_id: string;
  reminder_type: string;
  scheduled_at: string;
  message?: string;
  is_sent: boolean;
}

class NotificationService {
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  async getUserSettings(userId: string): Promise<NotificationSettings | null> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async createReminder(reminder: Omit<TicketReminder, 'id' | 'is_sent'>): Promise<void> {
    const { error } = await supabase
      .from('ticket_reminders')
      .insert(reminder);

    if (error) throw error;
  }

  async getReminders(userId: string): Promise<TicketReminder[]> {
    const { data, error } = await supabase
      .from('ticket_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_sent', false)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async deleteReminder(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('ticket_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => callback(payload.new as Notification)
      )
      .subscribe();
  }
}

export const notificationService = new NotificationService();