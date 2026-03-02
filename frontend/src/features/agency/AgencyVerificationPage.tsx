import { useState, useRef } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Card } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Label } from '../../app/components/ui/Label';


export function AgencyVerificationPage() {
    const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMsg, setErrorMsg] = useState('');
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        setStatus('SUBMITTING');
        setErrorMsg('');

        try {
            const formData = new FormData(formRef.current);
            const res = await apiFetch('/api/agency/verification/submit', {
                method: 'POST',
                body: formData
            }); // apiFetch handles headers for FormData automatically (removes Content-Type for browser boundary) if logic is correct, checking api-client logic below.
            // Actually standard fetch handles FormData correctly if no Content-Type header is set. 
            // Our api-client sets Content-Type: application/json by default unless body is FormData.

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Submission failed');
            }

            setStatus('SUCCESS');
        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            setErrorMsg(error.message);
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <Card className="p-12 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-bold text-green-700 mb-2">Submission Received</h2>
                    <p className="text-gray-600">
                        Your documents have been securely uploaded and are now under review. <br />
                        You will receive an email once the verification is complete (typically 24-48 hours).
                    </p>
                    <div className="mt-8">
                        <Button onClick={() => window.location.href = '/#/agency/dashboard'}>Return to Dashboard</Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Agency Verification</h1>
                <p className="text-sm text-gray-500">Submit your business documents to activate full account features.</p>
            </div>

            {status === 'ERROR' && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    <strong>Error:</strong> {errorMsg}
                </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Personal Information */}
                <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">1. Owner Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Full Name (as on ID)</Label>
                            <Input name="fullName" required placeholder="e.g. John Doe" />
                        </div>
                        <div>
                            <Label>Nationality</Label>
                            <Input name="nationality" required placeholder="e.g. German" />
                        </div>
                        <div>
                            <Label>ID Type</Label>
                            <select name="idType" className="w-full p-2 border rounded-md" required>
                                <option value="PASSPORT">Passport</option>
                                <option value="NATIONAL_ID">National ID / Emirates ID</option>
                            </select>
                        </div>
                        <div>
                            <Label>ID Number</Label>
                            <Input name="idNumber" required placeholder="Document Number" />
                        </div>
                        <div>
                            <Label>Expiry Date</Label>
                            <Input name="idExpiry" type="date" required />
                        </div>
                    </div>
                </Card>

                {/* 2. Documents */}
                <Card className="p-6 space-y-6">
                    <h3 className="text-lg font-semibold border-b pb-2">2. Document Uploads</h3>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <Label className="mb-2 block">Business Trade License / Registration</Label>
                            <Input name="businessDoc" type="file" required accept=".pdf,.jpg,.png,.jpeg" className="bg-gray-50" />
                            <p className="text-xs text-gray-500 mt-1">Upload valid company registration document.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 block">ID Front Side</Label>
                                <Input name="idFront" type="file" required accept=".jpg,.png,.jpeg" />
                            </div>
                            <div>
                                <Label className="mb-2 block">ID Back Side (Optional for Passport)</Label>
                                <Input name="idBack" type="file" accept=".jpg,.png,.jpeg" />
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Selfie with ID (For Security)</Label>
                            <Input name="selfie" type="file" accept=".jpg,.png,.jpeg" />
                            <p className="text-xs text-gray-500 mt-1">Please hold your ID next to your face.</p>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={status === 'SUBMITTING'}>
                        {status === 'SUBMITTING' ? 'Uploading...' : 'Submit Verification'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
