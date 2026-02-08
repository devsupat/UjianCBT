'use server';

/**
 * Student Management Server Actions
 * 
 * Handles CRUD operations for student accounts using Supabase Auth.
 * Students are created by admins with username/password for login.
 * 
 * Username uniqueness is per-school (via email: username@school_id.cbt.internal)
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

const EMAIL_DOMAIN = 'cbt.internal';

// =====================================
// Types
// =====================================

export interface CreateStudentInput {
    fullName: string;
    username: string;
    password: string;
    classGroup: string;
}

export interface StudentData {
    id: string;
    fullName: string;
    username: string;
    classGroup: string | null;
    status_ujian: string;
    createdAt: string;
}

interface ActionResult<T = undefined> {
    success: boolean;
    message: string;
    data?: T;
}

// =====================================
// Helper Functions
// =====================================

/**
 * Maps username to email format for Supabase Auth
 * Format: username@school_id.cbt.internal
 * This ensures username uniqueness per school
 */
function usernameToEmail(username: string, schoolId: string): string {
    return `${username.toLowerCase()}@${schoolId}.${EMAIL_DOMAIN}`;
}

/**
 * Verify that current user is an admin and get their school_id
 */
async function verifyAdminAndGetSchool(): Promise<{ success: true; schoolId: string } | { success: false; error: string }> {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Tidak terautentikasi. Silakan login kembali.' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, school_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { success: false, error: 'Profil tidak ditemukan.' };
    }

    // Type assertion for profile
    const typedProfile = profile as { role: string; school_id: string };

    if (typedProfile.role !== 'ADMIN') {
        return { success: false, error: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini.' };
    }

    return { success: true, schoolId: typedProfile.school_id };
}

// =====================================
// Server Actions
// =====================================

/**
 * Create a new student account
 * 
 * @param data Student data with fullName, username, password, classGroup
 * @returns Result with success status and created student data (including password for admin reference)
 */
export async function createStudent(data: CreateStudentInput): Promise<ActionResult<{ student: StudentData; password: string }>> {
    try {
        // Validate input
        if (!data.fullName.trim()) {
            return { success: false, message: 'Nama lengkap harus diisi.' };
        }
        if (!data.username.trim()) {
            return { success: false, message: 'Username harus diisi.' };
        }
        if (!data.password.trim()) {
            return { success: false, message: 'Password harus diisi.' };
        }
        if (!data.classGroup.trim()) {
            return { success: false, message: 'Kelas harus diisi.' };
        }

        // Validate username format (lowercase, no spaces)
        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(data.username.toLowerCase())) {
            return { success: false, message: 'Username hanya boleh huruf kecil, angka, dan underscore (_).' };
        }

        // Verify admin and get school_id
        const authResult = await verifyAdminAndGetSchool();
        if (!authResult.success) {
            return { success: false, message: authResult.error };
        }
        const { schoolId } = authResult;

        // Generate email (username@school_id.cbt.internal)
        const email = usernameToEmail(data.username, schoolId);

        // Create admin client for privileged operations
        const supabaseAdmin = createAdminClient();

        // Check if username already exists in this school
        // Since email is per-school (username@schoolId.cbt.internal), 
        // we check auth.users for existing email
        const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();

        if (searchError) {
            console.error('Error searching users:', searchError);
            return { success: false, message: 'Gagal memeriksa ketersediaan username.' };
        }

        const emailExists = existingUsers.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            return { success: false, message: `Username "${data.username}" sudah digunakan di sekolah ini.` };
        }

        // Create Auth User
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: data.password,
            email_confirm: true, // Auto-confirm email since it's internal
            user_metadata: {
                full_name: data.fullName.trim(),
                school_id: schoolId,
                role: 'STUDENT'
            }
        });

        if (createError || !authData.user) {
            console.error('Error creating auth user:', createError);
            return { success: false, message: createError?.message || 'Gagal membuat akun siswa.' };
        }

        // Upsert profile record (trigger may auto-create profile on user creation)
        const { error: profileError } = await (supabaseAdmin
            .from('profiles') as any)
            .upsert({
                id: authData.user.id,
                school_id: schoolId,
                full_name: data.fullName.trim(),
                username: data.username.toLowerCase().trim(),
                role: 'STUDENT',
                class_group: data.classGroup.trim(),
                status_ujian: 'BELUM'
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // Rollback: delete the auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return { success: false, message: 'Gagal membuat profil siswa. ' + profileError.message };
        }

        return {
            success: true,
            message: `Siswa "${data.fullName}" berhasil dibuat.`,
            data: {
                student: {
                    id: authData.user.id,
                    fullName: data.fullName.trim(),
                    username: data.username.toLowerCase().trim(),
                    classGroup: data.classGroup.trim(),
                    status_ujian: 'BELUM',
                    createdAt: authData.user.created_at
                },
                password: data.password // Return password for admin to note/print
            }
        };

    } catch (error) {
        console.error('createStudent error:', error);
        return { success: false, message: 'Terjadi kesalahan sistem.' };
    }
}

/**
 * Delete a student by their ID
 * Deletes from auth.users (cascades to profiles)
 */
export async function deleteStudent(studentId: string): Promise<ActionResult> {
    try {
        if (!studentId) {
            return { success: false, message: 'ID siswa tidak valid.' };
        }

        // Verify admin
        const authResult = await verifyAdminAndGetSchool();
        if (!authResult.success) {
            return { success: false, message: authResult.error };
        }
        const { schoolId } = authResult;

        const supabaseAdmin = createAdminClient();

        // Verify the student belongs to this school
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, school_id')
            .eq('id', studentId)
            .single();

        if (profileError || !profile) {
            return { success: false, message: 'Siswa tidak ditemukan.' };
        }

        // Type assertion
        const typedProfile = profile as { id: string; full_name: string; school_id: string };

        if (typedProfile.school_id !== schoolId) {
            return { success: false, message: 'Anda tidak memiliki akses untuk menghapus siswa ini.' };
        }

        // Delete from auth.users (this will cascade to profiles if FK is set up)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentId);

        if (deleteError) {
            console.error('Error deleting user:', deleteError);
            return { success: false, message: 'Gagal menghapus siswa. ' + deleteError.message };
        }

        // Also delete profile explicitly in case cascade isn't set up
        await supabaseAdmin.from('profiles').delete().eq('id', studentId);

        return {
            success: true,
            message: `Siswa "${typedProfile.full_name}" berhasil dihapus.`
        };

    } catch (error) {
        console.error('deleteStudent error:', error);
        return { success: false, message: 'Terjadi kesalahan sistem.' };
    }
}

/**
 * Get all students for the admin's school
 */
export async function getStudents(): Promise<ActionResult<StudentData[]>> {
    try {
        // Verify admin
        const authResult = await verifyAdminAndGetSchool();
        if (!authResult.success) {
            return { success: false, message: authResult.error };
        }
        const { schoolId } = authResult;

        // Use admin client to bypass RLS
        const supabaseAdmin = createAdminClient();

        // Fetch students for this school
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, class_group, status_ujian, created_at')
            .eq('school_id', schoolId)
            .eq('role', 'STUDENT')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching students:', error);
            return { success: false, message: 'Gagal mengambil data siswa.' };
        }

        // Type assertion and transformation
        type ProfileRow = { id: string; full_name: string; username: string | null; class_group: string | null; status_ujian: string | null; created_at: string };
        const typedProfiles = (profiles || []) as ProfileRow[];

        const students: StudentData[] = typedProfiles.map(p => ({
            id: p.id,
            fullName: p.full_name,
            username: p.username || p.full_name, // Fallback to full_name if username is null
            classGroup: p.class_group,
            status_ujian: p.status_ujian || 'BELUM',
            createdAt: p.created_at
        }));

        return {
            success: true,
            message: 'Data siswa berhasil dimuat.',
            data: students
        };

    } catch (error) {
        console.error('getStudents error:', error);
        return { success: false, message: 'Terjadi kesalahan sistem.' };
    }
}

/**
 * Update a student's information
 */
export async function updateStudent(
    studentId: string,
    data: { fullName?: string; classGroup?: string; password?: string }
): Promise<ActionResult> {
    try {
        if (!studentId) {
            return { success: false, message: 'ID siswa tidak valid.' };
        }

        // Verify admin
        const authResult = await verifyAdminAndGetSchool();
        if (!authResult.success) {
            return { success: false, message: authResult.error };
        }
        const { schoolId } = authResult;

        const supabaseAdmin = createAdminClient();

        // Verify the student belongs to this school
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, school_id')
            .eq('id', studentId)
            .single();

        if (profileError || !profile) {
            return { success: false, message: 'Siswa tidak ditemukan.' };
        }

        const typedProfile = profile as { id: string; school_id: string };

        if (typedProfile.school_id !== schoolId) {
            return { success: false, message: 'Anda tidak memiliki akses untuk mengubah siswa ini.' };
        }

        // Update profile if needed
        const profileUpdates: Record<string, string> = {};
        if (data.fullName?.trim()) {
            profileUpdates.full_name = data.fullName.trim();
        }
        if (data.classGroup?.trim()) {
            profileUpdates.class_group = data.classGroup.trim();
        }

        if (Object.keys(profileUpdates).length > 0) {
            const { error: updateError } = await (supabaseAdmin
                .from('profiles') as any)
                .update(profileUpdates)
                .eq('id', studentId);

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return { success: false, message: 'Gagal mengubah data siswa.' };
            }
        }

        // Update password if provided
        if (data.password?.trim()) {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                studentId,
                { password: data.password.trim() }
            );

            if (passwordError) {
                console.error('Error updating password:', passwordError);
                return { success: false, message: 'Gagal mengubah password.' };
            }
        }

        return {
            success: true,
            message: 'Data siswa berhasil diperbarui.'
        };

    } catch (error) {
        console.error('updateStudent error:', error);
        return { success: false, message: 'Terjadi kesalahan sistem.' };
    }
}
