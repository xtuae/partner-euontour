import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Lock, Settings, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { useAuth } from '../auth/AuthContext';

interface SystemSetting {
    key: string;
    value: string;
}

export function AdminSettingsPage() {
    const { user } = useAuth();
    // const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Only Super Admin can fetch global settings? Or separate endpoint.
            // Endpoint /api/super/system/settings is SUPER_ADMIN only.
            if (user?.role === 'SUPER_ADMIN') {
                const res = await apiFetch('/api/super/system/settings');
                if (res.ok) {
                    const data = await res.json();
                    const settingsMap: Record<string, string> = {};
                    data.settings.forEach((s: SystemSetting) => settingsMap[s.key] = s.value);
                    setSettings(settingsMap);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            // setLoading(false);
        }
    };

    const toggleSetting = async (key: string) => {
        const currentValue = settings[key] === 'true';
        const newValue = (!currentValue).toString();

        if (!confirm(`Switch ${key} to ${!currentValue}?`)) return;

        try {
            await apiFetch('/api/super/system/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    settings: [{ key, value: newValue }]
                })
            });
            setSettings(prev => ({ ...prev, [key]: newValue }));
        } catch (error) {
            alert('Update failed');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 mr-2" /> Platform Settings
            </h1>

            {user?.role === 'SUPER_ADMIN' && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-red-700">
                            <AlertTriangle className="w-5 h-5 mr-2" /> Global Emergency Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-red-900">Maintenance Mode</h3>
                                <p className="text-sm text-red-700">Disable all non-admin access.</p>
                            </div>
                            <Button
                                variant={settings['MAINTENANCE_MODE'] === 'true' ? 'destructive' : 'outline'}
                                onClick={() => toggleSetting('MAINTENANCE_MODE')}
                            >
                                {settings['MAINTENANCE_MODE'] === 'true' ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-orange-900">Disable All Deposits</h3>
                                <p className="text-sm text-orange-700">Prevent any new deposit submissions.</p>
                            </div>
                            <Button
                                variant={settings['DISABLE_DEPOSITS'] === 'true' ? 'destructive' : 'outline'}
                                onClick={() => toggleSetting('DISABLE_DEPOSITS')}
                            >
                                {settings['DISABLE_DEPOSITS'] === 'true' ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-gray-500" />
                        Admin Security
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">Password management and security settings.</p>
                    <Button variant="outline" onClick={() => alert('Password reset flow not implemented in this demo.')}>
                        Change Password
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
