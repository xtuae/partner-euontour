import { useState } from 'react';
import { useAuth } from '../auth/AuthContext'; // Correct path to AuthContext
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { User, Shield, Building, Mail, Phone, Lock } from 'lucide-react';

export function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Form State (Mock)
    const [agencyName, setAgencyName] = useState(user?.agency?.name || 'My Agency');
    const [email] = useState(user?.email || '');
    const [phone, setPhone] = useState('+49 123 456789');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Settings saved (Mock)!');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-brand-black mb-8">Account Settings</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 space-y-2">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile'
                            ? 'bg-brand-red text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Building className="w-4 h-4" />
                        <span>Agency Profile</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security'
                            ? 'bg-brand-red text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        <span>Security & Login</span>
                    </button>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-gray-500" />
                                    Agency Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="agencyName">Agency Name</Label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="agencyName"
                                                    value={agencyName}
                                                    onChange={e => setAgencyName(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="contactPerson">Contact Person</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="contactPerson"
                                                    defaultValue="John Doe"
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    disabled
                                                    className="pl-10 bg-gray-50 cursor-not-allowed" // Read-only
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                                        <Button type="submit">Save Changes</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-gray-500" />
                                    Security Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Change Password</h3>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label>Current Password</Label>
                                            <Input type="password" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>New Password</Label>
                                            <Input type="password" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Confirm New Password</Label>
                                            <Input type="password" />
                                        </div>
                                        <Button variant="outline" className="w-full sm:w-auto">Update Password</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
