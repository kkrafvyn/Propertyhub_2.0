import { supabase } from './supabase';
import type { PlatformConsoleGrant } from './platform-console-grants';
const db = supabase as any;
export type AppRole = { id: string; name: string; description: string; grants: PlatformConsoleGrant[]; revision: number };
export type AppRoleUser = { id: string; email: string | null; full_name: string | null; platform_role_id: string | null; is_platform_admin: boolean };
export const appRoleService = {
  async list(): Promise<AppRole[]> {
    const { data, error } = await db.from('platform_roles').select('id, name, description, grants, revision').order('name');
    if (error) throw new Error(error.message || 'Unable to complete the request.'); return data || [];
  },
  async users(email = ''): Promise<AppRoleUser[]> {
    const term = email.trim().replace(/[%_\\]/g, '');
    let query = db.from('users').select('id, email, full_name, platform_role_id, is_platform_admin').order('created_at', {ascending: false}).limit(100);
    if (term) query = query.ilike('email', `%${term}%`);
    const { data, error } = await query; if (error) throw new Error(error.message || 'Unable to complete the request.'); return data || [];
  },
  async save(input: { id: string | null; name: string; description: string; grants: PlatformConsoleGrant[]; revision: number }) {
    const { data, error } = await db.rpc('admin_save_platform_role', { p_id: input.id, p_name: input.name.trim(), p_description: input.description.trim(), p_grants: input.grants, p_expected_revision: input.revision });
    if (error) throw new Error(error.code === '23505' ? 'An app role with that name already exists.' : error.message || 'Unable to save the role.'); return data as string;
  },
  async assign(userId: string, roleId: string | null) {
    const { error } = await db.rpc('admin_assign_platform_role', { p_user_id: userId, p_role_id: roleId }); if (error) throw new Error(error.message || 'Unable to complete the request.');
  },
  async remove(id: string, revision: number) {
    const { error } = await db.rpc('admin_delete_platform_role', { p_id: id, p_expected_revision: revision }); if (error) throw new Error(error.message || 'Unable to complete the request.');
  },
};
