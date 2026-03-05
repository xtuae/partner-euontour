import { useState } from 'react';
import { Button } from '../../app/components/ui/Button';
import { XCircle, UploadCloud } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface ProxyKycUploadModalProps {
    agencyId: string;
    agencyName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ProxyKycUploadModal({ agencyId, agencyName, onClose, onSuccess }: ProxyKycUploadModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        nationality: '',
        idType: 'PASSPORT',
        idNumber: '',
        idExpiry: '',
        licenseExpiry: ''
    });

    const [files, setFiles] = useState({
        businessDoc: null as File | null,
        idFront: null as File | null,
        idBack: null as File | null,
        selfie: null as File | null,
        passportDoc: null as File | null
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!files.businessDoc || !files.idFront || !formData.fullName || !formData.licenseExpiry) {
            return alert('Please fill all required fields (Company Doc, ID Front, Full Name, License Expiry)');
        }

        setIsSubmitting(true);
        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
        if (files.businessDoc) submitData.append('businessDoc', files.businessDoc);
        if (files.idFront) submitData.append('idFront', files.idFront);
        if (files.idBack) submitData.append('idBack', files.idBack);
        if (files.selfie) submitData.append('selfie', files.selfie);
        if (files.passportDoc) submitData.append('passportDoc', files.passportDoc);

        try {
            const res = await apiFetch(`/api/super/agencies/${agencyId}/kyc`, {
                method: 'POST',
                body: submitData
            });

            if (res.ok) {
                alert('Proxy KYC Uploaded Successfully');
                onSuccess();
            } else {
                const err = await res.json();
                alert(err.error || 'Upload failed');
            }
        } catch (error) {
            alert('Upload error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all relative">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Upload KYC (Proxy)</h2>
                        <p className="text-sm text-gray-500 mt-1">Uploading on behalf of: <span className="font-semibold text-brand-red">{agencyName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <XCircle size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input required type="text" className="w-full border p-2 rounded" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                            <input type="text" className="w-full border p-2 rounded" value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                            <select className="w-full border p-2 rounded" value={formData.idType} onChange={e => setFormData({ ...formData, idType: e.target.value })}>
                                <option value="PASSPORT">Passport</option>
                                <option value="NATIONAL_ID">National ID</option>
                                <option value="DRIVERS_LICENSE">Drivers License</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                            <input type="text" className="w-full border p-2 rounded" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Expiry</label>
                            <input type="date" className="w-full border p-2 rounded" value={formData.idExpiry} onChange={e => setFormData({ ...formData, idExpiry: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry Date * (6mo min)</label>
                            <input required type="date" className="w-full border p-2 rounded border-brand-red focus:ring-brand-red" value={formData.licenseExpiry} onChange={e => setFormData({ ...formData, licenseExpiry: e.target.value })} />
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><UploadCloud size={18} /> Required Documents</h3>
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company Trade License / Registration *</label>
                                <input required type="file" accept="image/*,.pdf" className="mt-1 w-full text-sm" onChange={e => handleFileChange(e, 'businessDoc')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ID Front *</label>
                                <input required type="file" accept="image/*,.pdf" className="mt-1 w-full text-sm" onChange={e => handleFileChange(e, 'idFront')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ID Back</label>
                                <input type="file" accept="image/*,.pdf" className="mt-1 w-full text-sm" onChange={e => handleFileChange(e, 'idBack')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Selfie</label>
                                <input type="file" accept="image/*" className="mt-1 w-full text-sm" onChange={e => handleFileChange(e, 'selfie')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 text-brand-blue">Passport Copy</label>
                                <input type="file" accept="image/*,.pdf" className="mt-1 w-full text-sm" onChange={e => handleFileChange(e, 'passportDoc')} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white border-t border-gray-100 mt-6 p-4 -ml-6 -mr-6 mb-[-24px] rounded-b-xl z-10">
                        <Button variant="outline" type="button" onClick={onClose} className="px-6">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="px-6 bg-brand-red hover:bg-red-700 shadow-md">
                            {isSubmitting ? 'Uploading...' : 'Submit Proxy KYC'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

