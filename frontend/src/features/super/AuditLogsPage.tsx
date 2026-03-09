import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../app/components/ui/Card';
import { Button } from '../../app/components/ui/Button';
import { Input } from '../../app/components/ui/Input';
import { Search, Eye, Download, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { exportToCSV } from '../../utils/exportUtils';

interface AuditLog {
    id: string;
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: any;
    ipAddress: string;
    createdAt: string;
}

export function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPayload, setSelectedPayload] = useState<any>(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/api/super/logs') as any;
            setLogs(data.logs || []);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actorId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportCSV = () => {
        const exportData = filteredLogs.map(log => ({
            'Timestamp': new Date(log.createdAt).toLocaleString(),
            'Actor Role': log.actorRole,
            'Actor ID': log.actorId,
            'Action': log.action,
            'Entity Type': log.entityType,
            'Entity ID': log.entityId,
            'IP Address': log.ipAddress || 'N/A'
        }));
        exportToCSV(exportData, 'system_audit_logs');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading system audit trail...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Audit Logs</h1>
                    <p className="text-gray-500 mt-1">Immutable ledger of all critical system actions</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button variant="outline" onClick={fetchLogs} className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                </div>
            </div>

            <Card className="mb-6 border-gray-200">
                <CardContent className="p-4 flex gap-4">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Search by Action or Actor ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 max-w-md w-full"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-gray-200">
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase font-semibold border-b border-gray-200">
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Actor</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Entity</th>
                                <th className="p-4 text-right">Payload</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">No logs found matching search.</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 text-sm transition-colors text-gray-800">
                                        <td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                                        <td className="p-4">
                                            <div className="font-medium">{log.actorRole}</div>
                                            <div className="text-xs text-gray-500">{log.actorId}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-mono text-xs font-semibold">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium">{log.entityType}</div>
                                            <div className="text-xs text-gray-500">{log.entityId}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {log.details ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-500 hover:text-brand-red p-2 h-auto"
                                                    onClick={() => setSelectedPayload(log.details)}
                                                    title="View Payload"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Payload Modal */}
            {selectedPayload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-gray-100">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h2 className="text-lg font-bold font-mono text-gray-800">Payload Details</h2>
                            <button onClick={() => setSelectedPayload(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto shadow-inner">
                                {JSON.stringify(selectedPayload, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-xl">
                            <Button variant="outline" onClick={() => setSelectedPayload(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
