// Auth
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'user' | 'premium' | 'admin';
  avatar_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Health
export interface HealthProfile {
  diabetes_type: 'type1' | 'type2' | 'gestational' | 'prediabetes' | 'none';
  target_glucose_min: number;
  target_glucose_max: number;
  hba1c_latest?: number;
  weight_kg?: number;
  height_cm?: number;
  age?: number;
  allergies: string[];
  dietary_restrictions: string[];
  activity_level?: string;
  medications: any[];
}

// Scan
export interface NutritionData {
  calories?: number;
  carbs_g?: number;
  protein_g?: number;
  fat_g?: number;
  sugar_g?: number;
  fiber_g?: number;
}

export interface GlycemicData {
  glycemic_index?: number;
  glycemic_load?: number;
  estimated_spike_mg_dl?: number;
  diabetes_safety_score?: number;
}

export interface ScanResult {
  id: string;
  image_url: string;
  food_name?: string;
  food_category?: string;
  ingredients: string[];
  estimated_weight_g?: number;
  serving_size?: string;
  nutrition_data?: NutritionData;
  glycemic_data?: GlycemicData;
  risk_level?: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
  alternatives: { name: string; reason: string }[];
  confidence_score?: number;
  processing_status: string;
  is_user_corrected: boolean;
  processing_time_ms?: number;
  scanned_at: string;
}

export interface ScanStats {
  total_scans: number;
  high_risk_meals: number;
  safe_rate: number;
  avg_safety_score: number;
}

// Glucose
export interface GlucoseReading {
  id: string;
  glucose_value_mg_dl: number;
  measured_at: string;
  measurement_type: string;
  notes?: string;
  source: string;
}

export interface GlucoseTrends {
  readings: GlucoseReading[];
  avg?: number;
  min_val?: number;
  max_val?: number;
  tir?: number;
  count: number;
}

// Dashboard
export interface DashboardData {
  health_score: {
    score: number;
    summary: string;
  };
  glucose: {
    avg?: number;
    min?: number;
    max?: number;
    tir?: number;
    readings_count: number;
  };
  scans: ScanStats;
  recent_scans: ScanResult[];
  recent_glucose: GlucoseReading[];
}

// Chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sent_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  last_message_at?: string;
  messages: ChatMessage[];
}
