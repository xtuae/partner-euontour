import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Lock } from 'lucide-react';

export function AdminSettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-gray-500" />
                        Security
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">Password management and security settings.</p>
                    <Button variant="outline" onClick={() => alert('Password reset flow not implemented in this demo.')}>
                        Change Password
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">Global system settings (e.g., currency, tax rates) would go here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
