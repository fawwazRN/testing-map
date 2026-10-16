import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY; // anon key memang publik; JANGAN pernah pakai service_role di frontend

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key) : null;

export async function listTrips() {
  const { data, error } = await supabase.from("trips").select("id,title,updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function getTrip(id) {
  const { data, error } = await supabase.from("trips").select("id,title,data").eq("id", id).single();
  if (error) throw error;
  return data;
}
export async function saveTrip({ id, title, data }) {
  const q = id
    ? supabase.from("trips").update({ title, data, updated_at: new Date().toISOString() }).eq("id", id)
    : supabase.from("trips").insert({ title, data });
  const { data: row, error } = await q.select("id,title").single();
  if (error) throw error;
  return row;
}
export async function deleteTrip(id) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}
