// src/types/supabase.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: 'user' | 'admin'
          is_premium: boolean
          points: number
          language: 'pt' | 'en'
          theme: 'dark' | 'light'
          avatar_url: string | null
          age: number | null
          height: number | null
          weight: number | null
          fat_percentage: number | null
          gender: 'male' | 'female' | null
          activity_level: string | null
          training_level: string | null
          objective: string | null
          training_time: string | null
          routine: string | null
          sleep: string | null
          current_diet: string | null
          financial_condition: string | null
          wants_supplements: boolean
          personality_mode: string
          health_conditions: string | null
          onboarding_done: boolean
          nutrition_quiz_done: boolean | null
          cooking_skill: string | null
          meal_prep_time: string | null
          favorite_proteins: string[] | null
          favorite_carbs: string[] | null
          food_intolerances: string[] | null
          disliked_foods: string | null
          meals_per_day: string | null
          training_plan: string | null
          nutrition_plan: string | null
          last_analysis: string | null
          target_calories: number | null
          target_protein: number | null
          target_carbs: number | null
          target_fat: number | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      meals: {
        Row: {
          id: string
          user_id: string
          name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          meal_type: string
          logged_at: string
        }
        Insert: Omit<Database['public']['Tables']['meals']['Row'], 'id' | 'logged_at'>
        Update: Partial<Database['public']['Tables']['meals']['Row']>
      }
      water_logs: {
        Row: { id: string; user_id: string; amount_ml: number; logged_at: string }
        Insert: Omit<Database['public']['Tables']['water_logs']['Row'], 'id' | 'logged_at'>
        Update: Partial<Database['public']['Tables']['water_logs']['Row']>
      }
      weight_history: {
        Row: { id: string; user_id: string; weight: number; recorded_at: string }
        Insert: Omit<Database['public']['Tables']['weight_history']['Row'], 'id' | 'recorded_at'>
        Update: Partial<Database['public']['Tables']['weight_history']['Row']>
      }
      shape_history: {
        Row: { id: string; user_id: string; image_url: string | null; analysis: Json; fat_percentage: number | null; muscle_score: number | null; recorded_at: string }
        Insert: Omit<Database['public']['Tables']['shape_history']['Row'], 'id' | 'recorded_at'>
        Update: Partial<Database['public']['Tables']['shape_history']['Row']>
      }
      chat_messages: {
        Row: { id: string; user_id: string; role: 'user' | 'assistant'; content: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>
      }
      daily_missions: {
        Row: { id: string; user_id: string; date: string; protein_met: boolean; training_done: boolean; cardio_done: boolean; water_met: boolean }
        Insert: Omit<Database['public']['Tables']['daily_missions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['daily_missions']['Row']>
      }
      challenges: {
        Row: { id: string; user_id: string; status: string; current_day: number; before_image_url: string | null; after_image_url: string | null; started_at: string; completed_at: string | null }
        Insert: Omit<Database['public']['Tables']['challenges']['Row'], 'id' | 'started_at'>
        Update: Partial<Database['public']['Tables']['challenges']['Row']>
      }
      system_settings: {
        Row: { key: string; value: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['system_settings']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['system_settings']['Row']>
      }
    }
  }
}

// App-level types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Meal = Database['public']['Tables']['meals']['Row']
export type WaterLog = Database['public']['Tables']['water_logs']['Row']
export type ShapeHistory = Database['public']['Tables']['shape_history']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type DailyMission = Database['public']['Tables']['daily_missions']['Row']
export type Challenge = Database['public']['Tables']['challenges']['Row']
