export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cupo_ocupado: {
        Row: {
          grupo: string
          inscriptos: number
          quincena: number
          sede: string
        }
        Insert: {
          grupo: string
          inscriptos?: number
          quincena: number
          sede: string
        }
        Update: {
          grupo?: string
          inscriptos?: number
          quincena?: number
          sede?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupo_ocupado_grupo_fkey"
            columns: ["grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupo_ocupado_quincena_fkey"
            columns: ["quincena"]
            isOneToOne: false
            referencedRelation: "quincenas"
            referencedColumns: ["numero"]
          },
          {
            foreignKeyName: "cupo_ocupado_sede_fkey"
            columns: ["sede"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_ocupado: {
        Row: {
          extra: string
          inscriptos: number
          quincena: number
        }
        Insert: {
          extra: string
          inscriptos?: number
          quincena: number
        }
        Update: {
          extra?: string
          inscriptos?: number
          quincena?: number
        }
        Relationships: [
          {
            foreignKeyName: "extra_ocupado_extra_fkey"
            columns: ["extra"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_ocupado_quincena_fkey"
            columns: ["quincena"]
            isOneToOne: false
            referencedRelation: "quincenas"
            referencedColumns: ["numero"]
          },
        ]
      }
      extras: {
        Row: {
          cupo: number
          grupos_excluidos: string[]
          id: string
          nombre: string
          precio: number
          turno: string
        }
        Insert: {
          cupo: number
          grupos_excluidos?: string[]
          id: string
          nombre: string
          precio: number
          turno: string
        }
        Update: {
          cupo?: number
          grupos_excluidos?: string[]
          id?: string
          nombre?: string
          precio?: number
          turno?: string
        }
        Relationships: []
      }
      grupos: {
        Row: {
          cupo_barda: number
          cupo_confluencia: number
          edad_max: number
          edad_min: number
          id: string
          nombre: string
        }
        Insert: {
          cupo_barda: number
          cupo_confluencia: number
          edad_max: number
          edad_min: number
          id: string
          nombre: string
        }
        Update: {
          cupo_barda?: number
          cupo_confluencia?: number
          edad_max?: number
          edad_min?: number
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      inscripciones: {
        Row: {
          adulto: string
          created_at: string
          email: string
          extras: Json
          fecha_nacimiento: string
          grupo: string
          id: string
          nino: string
          quincenas: number[]
          sede: string
          telefono: string
          total: number
        }
        Insert: {
          adulto: string
          created_at?: string
          email: string
          extras?: Json
          fecha_nacimiento: string
          grupo: string
          id?: string
          nino: string
          quincenas: number[]
          sede: string
          telefono: string
          total: number
        }
        Update: {
          adulto?: string
          created_at?: string
          email?: string
          extras?: Json
          fecha_nacimiento?: string
          grupo?: string
          id?: string
          nino?: string
          quincenas?: number[]
          sede?: string
          telefono?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_grupo_fkey"
            columns: ["grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_sede_fkey"
            columns: ["sede"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      quincenas: {
        Row: {
          cuota: number
          fecha_fin: string
          fecha_inicio: string
          numero: number
          tematica: string
        }
        Insert: {
          cuota?: number
          fecha_fin: string
          fecha_inicio: string
          numero: number
          tematica: string
        }
        Update: {
          cuota?: number
          fecha_fin?: string
          fecha_inicio?: string
          numero?: number
          tematica?: string
        }
        Relationships: []
      }
      sedes: {
        Row: {
          horario_fin: string
          horario_inicio: string
          id: string
          nombre: string
          turno: string
        }
        Insert: {
          horario_fin: string
          horario_inicio: string
          id: string
          nombre: string
          turno: string
        }
        Update: {
          horario_fin?: string
          horario_inicio?: string
          id?: string
          nombre?: string
          turno?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirmar_inscripcion: {
        Args: {
          p_adulto: string
          p_email: string
          p_extras: Json
          p_fecha_nacimiento: string
          p_nino: string
          p_quincenas: number[]
          p_sede: string
          p_telefono: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
