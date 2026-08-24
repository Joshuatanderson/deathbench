import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

export type EditorDatabase = NeonQueryFunction<false, false>

export function connectEditorDatabase(connectionString: string): EditorDatabase {
  return neon(connectionString)
}
