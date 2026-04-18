export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          username: string | null;
          bio: string | null;
          avatar_url: string | null;
          score: number;
          day_streak: number;
          sessions_completed: number;
          total_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          score?: number;
          day_streak?: number;
          sessions_completed?: number;
          total_hours?: number;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          score?: number;
          day_streak?: number;
          sessions_completed?: number;
          total_hours?: number;
        };
        Relationships: [];
      };
      alarms: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          next_fire_at: string;
          repeat_days: number[];
          mantra_id: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          next_fire_at: string;
          repeat_days?: number[];
          mantra_id: string;
          enabled?: boolean;
        };
        Update: {
          label?: string;
          next_fire_at?: string;
          repeat_days?: number[];
          mantra_id?: string;
          enabled?: boolean;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant";
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "user" | "assistant";
          text: string;
        };
        Update: {
          text?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          recorded_at?: string;
        };
        Update: {
          score?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          progress: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          progress?: number;
        };
        Update: {
          name?: string;
          progress?: number;
        };
        Relationships: [];
      };
      activity: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          duration_min: number | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          duration_min?: number | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: string | null;
          duration_min?: number | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          narrator: string;
          duration_sec: number;
          audio_url: string | null;
          audio_asset: string | null;
          plays: number;
          mantras: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          category: string;
          narrator?: string;
          duration_sec: number;
          audio_url?: string | null;
          audio_asset?: string | null;
          plays?: number;
          mantras?: string[];
        };
        Update: {
          title?: string;
          description?: string;
          category?: string;
          narrator?: string;
          duration_sec?: number;
          audio_url?: string | null;
          audio_asset?: string | null;
          plays?: number;
          mantras?: string[];
        };
        Relationships: [];
      };
      preferences: {
        Row: {
          user_id: string;
          notifications: boolean;
          haptics: boolean;
          dark_mode: boolean;
          default_sound: string;
          default_duration_min: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          notifications?: boolean;
          haptics?: boolean;
          dark_mode?: boolean;
          default_sound?: string;
          default_duration_min?: number;
        };
        Update: {
          notifications?: boolean;
          haptics?: boolean;
          dark_mode?: boolean;
          default_sound?: string;
          default_duration_min?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
