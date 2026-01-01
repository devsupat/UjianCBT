import type {
    ApiResponse,
    User,
    UserForPrint,
    Question,
    LiveScoreEntry,
    LiveScoreStats,
    ExamConfig,
    AnswersRecord
} from '@/types';

// Use local API proxy to avoid CORS issues with Google Apps Script
const API_URL = '/api/proxy';

/**
 * Base fetch wrapper using local proxy
 * The proxy forwards requests to Google Apps Script
 */
async function fetchApi<T>(
    action: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
): Promise<ApiResponse<T>> {
    try {
        const url = method === 'GET'
            ? `${API_URL}?action=${action}`
            : API_URL;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (method === 'POST' && body) {
            options.body = JSON.stringify({ action, ...body });
        }

        const response = await fetch(url, options);
        const data = await response.json();

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Network error'
        };
    }
}

// ===== AUTH APIs =====

export async function login(username: string, password: string): Promise<ApiResponse<User>> {
    return fetchApi<User>('login', 'POST', { username, password });
}

export async function adminLogin(password: string): Promise<ApiResponse> {
    return fetchApi('adminLogin', 'POST', { password });
}

// ===== EXAM APIs =====

export async function getQuestions(): Promise<ApiResponse<Question[]>> {
    return fetchApi<Question[]>('getQuestions');
}

export async function getConfig(): Promise<ApiResponse<ExamConfig>> {
    return fetchApi<ExamConfig>('getConfig');
}

export async function syncAnswers(id_siswa: string, answers: AnswersRecord): Promise<ApiResponse> {
    return fetchApi('syncAnswers', 'POST', { id_siswa, answers });
}

export async function submitExam(
    id_siswa: string,
    answers: AnswersRecord,
    forced: boolean = false
): Promise<ApiResponse<{ score: string; status: string }>> {
    return fetchApi('submitExam', 'POST', { id_siswa, answers, forced });
}

export async function reportViolation(
    id_siswa: string,
    type: string
): Promise<ApiResponse<{ violations: number; disqualified: boolean }>> {
    return fetchApi('reportViolation', 'POST', { id_siswa, type });
}

// ===== LIVE SCORE APIs =====

export async function getLiveScore(): Promise<ApiResponse<LiveScoreEntry[]> & { stats?: LiveScoreStats }> {
    return fetchApi<LiveScoreEntry[]>('getLiveScore');
}

// ===== ADMIN APIs =====

export async function getUsers(): Promise<ApiResponse<User[]>> {
    return fetchApi<User[]>('getUsers');
}

export async function getUsersForPrint(): Promise<ApiResponse<UserForPrint[]>> {
    return fetchApi<UserForPrint[]>('getUsersForPrint');
}

export async function resetUserLogin(id_siswa: string): Promise<ApiResponse> {
    return fetchApi('resetUserLogin', 'POST', { id_siswa });
}

export async function createQuestion(data: Partial<Question> & { kunci_jawaban: string }): Promise<ApiResponse> {
    return fetchApi('createQuestion', 'POST', { data });
}

export async function updateQuestion(
    id_soal: string,
    data: Partial<Question> & { kunci_jawaban: string }
): Promise<ApiResponse> {
    return fetchApi('updateQuestion', 'POST', { id_soal, data });
}

export async function deleteQuestion(id_soal: string): Promise<ApiResponse> {
    return fetchApi('deleteQuestion', 'POST', { id_soal });
}

export async function updateConfig(key: string, value: string | number | boolean): Promise<ApiResponse> {
    return fetchApi('updateConfig', 'POST', { key, value });
}

export async function exportResults(): Promise<ApiResponse<unknown[][]>> {
    return fetchApi<unknown[][]>('exportResults');
}

// ===== PIN AUTHENTICATION APIs =====

export async function getExamPinStatus(): Promise<ApiResponse<{ isPinRequired: boolean }>> {
    return fetchApi<{ isPinRequired: boolean }>('getExamPinStatus');
}

export async function validateExamPin(pin: string): Promise<ApiResponse> {
    return fetchApi('validateExamPin', 'POST', { pin });
}

export async function setExamPin(pin: string, adminPassword: string): Promise<ApiResponse> {
    return fetchApi('setExamPin', 'POST', { pin, adminPassword });
}

export async function resetTodayExam(adminPassword: string): Promise<ApiResponse<{ resetCount: number }>> {
    return fetchApi('resetTodayExam', 'POST', { adminPassword });
}
