'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminLogin } from '@/lib/api';

export default function AdminLoginPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password.trim()) {
            setError('Password harus diisi');
            return;
        }

        setIsLoading(true);

        try {
            const response = await adminLogin(password);

            if (response.success) {
                sessionStorage.setItem('admin_auth', 'true');
                router.push('/admin/dashboard');
            } else {
                setError(response.message || 'Login gagal');
            }
        } catch {
            setError('Terjadi kesalahan. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="shadow-xl">
                    <CardHeader className="text-center space-y-4">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25"
                        >
                            <Shield className="w-10 h-10 text-white" />
                        </motion.div>
                        <div>
                            <CardTitle className="text-2xl gradient-text">
                                Admin Dashboard
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Masukkan password administrator
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm text-slate-600 flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    Password Admin
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Masukkan password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5" />
                                        Masuk
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
