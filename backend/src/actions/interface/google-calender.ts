export interface GoogleCalendarActionData {
  action_type: 'get_upcoming_events';
  time_range?: {
    start?: string;
    end?: string;
    hours_ahead?: number;
  };
  calendar_id?: string;
  max_results?: number;
}

export interface CalendarEvent {
  event_id: string;
  event_title: string;
  event_summery: string;
  event_description?: string;
  event_start_time?: string;     // e.g. "15:15"
  event_end_time?: string;       // e.g. "16:15"
  event_date?: string;           // e.g. "2025-05-30"
  event_organizer_name: string;
  event_attendees_name: string;
  event_attendees_email: string;
}
