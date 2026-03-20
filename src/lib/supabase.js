import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jmzwtwbaabxzwbyvplws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptend0d2JhYWJ4endieXZwbHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDA3NzcsImV4cCI6MjA4OTU3Njc3N30.9kG79rzuAZeT9Q5H-p11Fs17KLuACWExV-K4_6iZGho'
)
