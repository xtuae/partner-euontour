import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { Building, Sliders, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../../lib/api-client';

interface SystemSetting {
    key: string;
    value: string;
}

export function GeneralSettings() {
    const { user } = useAuth();
    const role = user?.role;

    if (role === 'SUPER_ADMIN') {
        return <SuperAdminSettings />;
    }

    if (role === 'AGENCY') {
        return <AgencyGeneralSettings />;
    }

    // Admins hide general settings or show minimal content
    return (
        <Card>
            <CardContent className="p-12 text-center text-gray-500">
                You do not have access to any general organization settings.
            </CardContent>
        </Card>
    );
}

function AgencyGeneralSettings() {
    const { user } = useAuth();
    const [agencyName, setAgencyName] = useState(user?.agency?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await apiFetch('/api/settings/agency', {
                method: 'PUT',
                body: JSON.stringify({ name: agencyName })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update settings');
            }

            toast.success('Agency settings saved');
        } catch (error: any) {
            toast.error(error.message || 'Error updating settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-gray-500" />
                    Business & Agency Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2 max-w-md">
                        <Label htmlFor="agencyName">Business / Agency Name</Label>
                        <Input
                            id="agencyName"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            placeholder="Enter Business Name"
                        />
                        <p className="text-xs text-gray-400">This name will appear on your dashboard and invoices.</p>
                    </div>

                    <div className="space-y-2 max-w-md">
                        <Label>Tax / VAT ID (Coming Soon)</Label>
                        <Input disabled placeholder="DE123456789" />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function SuperAdminSettings() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [discountValue, setDiscountValue] = useState<string>('10');
    const [isSavingDiscount, setIsSavingDiscount] = useState(false);
    const [stripeTestMode, setStripeTestMode] = useState<boolean>(true);

    useEffect(() => {
        fetchSettings();
        fetchSystemSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await apiFetch('/api/super/system/settings');
            if (res.ok) {
                const data = await res.json();
                const settingsMap: Record<string, string> = {};
                data.settings.forEach((s: SystemSetting) => settingsMap[s.key] = s.value);
                setSettings(settingsMap);
                if (settingsMap['AGENCY_DISCOUNT_PERCENTAGE']) {
                    setDiscountValue(settingsMap['AGENCY_DISCOUNT_PERCENTAGE']);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleSetting = async (key: string) => {
        const currentValue = settings[key] === 'true';
        const newValue = (!currentValue).toString();

        if (!confirm(`Switch ${key} to ${!currentValue}?`)) return;

        try {
            await apiFetch('/api/super/system/settings', {
                method: 'PUT',
                body: JSON.stringify({ settings: [{ key, value: newValue }] })
            });
            setSettings(prev => ({ ...prev, [key]: newValue }));
            toast.success(`${key} updated`);
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const fetchSystemSettings = async () => {
        try {
            const res = await apiFetch('/api/super/settings/system');
            if (res.ok) {
                const data = await res.json();
                setStripeTestMode(data.stripeTestMode);
            }
        } catch (e) {
            console.error('Failed to fetch system settings', e);
        }
    };

    const toggleStripeMode = async () => {
        const newValue = !stripeTestMode;
        if (!confirm(`Are you sure you want to switch Stripe to ${newValue ? 'Test Mode' : 'Live Mode'}?`)) return;

        try {
            const res = await apiFetch('/api/super/settings/system', {
                method: 'PUT',
                body: JSON.stringify({ stripeTestMode: newValue })
            });
            if (res.ok) {
                setStripeTestMode(newValue);
                toast.success(`Stripe is now in ${newValue ? 'Test Mode (Safe)' : 'Live Mode (Production)'}`);
            } else {
                toast.error('Failed to update Stripe mode.');
            }
        } catch (e) {
            toast.error('Update failed');
        }
    };

    const saveDiscount = async () => {
        setIsSavingDiscount(true);
        try {
            const res = await apiFetch('/api/super/system/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    settings: [{ key: 'AGENCY_DISCOUNT_PERCENTAGE', value: String(discountValue) }]
                })
            });
            if (res.ok) {
                toast.success('Discount settings updated!');
                setSettings(prev => ({ ...prev, 'AGENCY_DISCOUNT_PERCENTAGE': discountValue }));
            } else {
                toast.error('Failed to update discount settings.');
            }
        } catch (error) {
            toast.error('Update failed');
        } finally {
            setIsSavingDiscount(false);
        }
    };

    return (
        <div className="space-y-6">
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

            <Card className="border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center text-blue-800">
                        <Building className="w-5 h-5 mr-2" /> Financial Integrations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div>
                            <h3 className="font-medium text-blue-900">Stripe Environment</h3>
                            <p className="text-sm text-blue-700">Control active Stripe keys used across the platform.</p>
                        </div>
                        <Button
                            variant={stripeTestMode ? 'outline' : undefined}
                            className={!stripeTestMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                            onClick={toggleStripeMode}
                        >
                            {stripeTestMode ? 'Test Mode (Safe)' : 'Live Mode (Production)'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-gray-800">
                        <Sliders className="w-5 h-5 mr-2 text-gray-500" /> Pricing Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="discount" className="text-sm font-medium text-gray-700">Global Agency Discount (%)</label>
                        <div className="flex items-center max-w-sm space-x-3">
                            <div className="relative flex-1">
                                <input
                                    id="discount"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:ring-brand-red focus:border-brand-red sm:text-sm"
                                    placeholder="10"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">%</span>
                                </div>
                            </div>
                            <Button
                                onClick={saveDiscount}
                                disabled={isSavingDiscount}
                                className="bg-brand-red hover:bg-red-700 text-white"
                            >
                                {isSavingDiscount ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                            This controls the default wholesale cost applied to newly synced tours from WordPress.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
