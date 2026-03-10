import { useState, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';
import { User, Lock, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../../lib/api-client';

export function ProfileSettings() {
    const { user } = useAuth();
    const typedUser = user as any;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(typedUser?.name || '');
    const [profilePicture, setProfilePicture] = useState(typedUser?.profilePicture || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await apiFetch('/api/files/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Failed to upload photo');
            const data = await res.json();

            setProfilePicture(data.url);
            toast.success('Photo uploaded successfully');

            // Auto-save the profile picture update
            await saveProfile(data.url);
        } catch (error: any) {
            toast.error(error.message || 'Error uploading photo');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const saveProfile = async (newPicUrl?: string) => {
        setIsSaving(true);
        try {
            if (newPassword && newPassword !== confirmPassword) {
                toast.error('Passwords do not match');
                setIsSaving(false);
                return;
            }

            const payload: any = {
                name,
                profilePicture: newPicUrl || profilePicture
            };

            if (currentPassword && newPassword) {
                payload.currentPassword = currentPassword;
                payload.newPassword = newPassword;
            }

            const res = await apiFetch('/api/users/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            toast.success('Profile updated successfully');
            if ((useAuth as any).mutate) {
                (useAuth as any).mutate(); // Refresh global auth context if available
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Error updating profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveProfile();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-500" />
                        My Profile
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveSubmit} className="space-y-8">
                        {/* Avatar Upload */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 text-gray-400" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-brand-red text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition flex items-center justify-center"
                                    disabled={isUploading}
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-lg font-bold text-gray-900">{typedUser?.name || 'User Profile'}</h3>
                                <p className="text-sm text-gray-500">{typedUser?.email}</p>
                                <p className="text-xs font-semibold text-brand-red mt-1 px-2 py-0.5 bg-red-50 inline-block rounded uppercase tracking-wide">
                                    {typedUser?.role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>

                        {/* Personal Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={typedUser?.email || ''}
                                    disabled
                                    className="bg-gray-50 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-400">Email cannot be changed directly.</p>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={isSaving || isUploading}>
                                {isSaving ? 'Saving...' : 'Save Profile Details'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-gray-500" />
                        Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 max-w-md">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                        </div>
                        <div className="pt-2">
                            <Button variant="outline" onClick={() => saveProfile()} disabled={!currentPassword || !newPassword || isSaving}>
                                Update Password
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
