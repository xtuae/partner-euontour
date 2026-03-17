import { useState } from 'react';
import { CheckCircle, Download, FileText } from 'lucide-react';
import { exportToCSV, generatePDFReport } from '../../utils/export';

// We will just use standard fetch with Authorization from local storage.

export function ReportsPage() {
    const [reportType, setReportType] = useState('agencies');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            setError('Please select both start and end dates.');
            return;
        }

        setLoading(true);
        setError(null);
        setData([]);

        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch report data');
            }

            const json = await res.json();
            if (json.data) {
                setData(json.data);
            } else if (json.error) {
                setError(json.error);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred fetching the report.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCSV = () => {
        exportToCSV(`${reportType.toUpperCase()} Report`, data);
    };

    const handleDownloadPDF = () => {
        const dateRangeStr = `${startDate} to ${endDate}`;
        generatePDFReport(`${reportType.toUpperCase()} Report`, data, dateRangeStr);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <p className="mt-2 text-sm text-gray-600">Generate and export comprehensive reports across the platform.</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                        >
                            <option value="agencies">Agencies</option>
                            <option value="bookings">Global Bookings</option>
                            <option value="deposits">Deposit History</option>
                            <option value="wallet">Wallet Ledger</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex justify-center items-center"
                        >
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
            </div>

            {data.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 className="text-lg font-medium text-gray-900">
                            Results ({data.length} records)
                        </h3>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleDownloadCSV}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                Download CSV
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {Object.keys(data[0]).map((key) => (
                                        <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.slice(0, 10).map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        {Object.values(row).map((val: any, j) => (
                                            <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {val === null || val === undefined ? '-' : val.toString()}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data.length > 10 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                            Showing first 10 rows. Download report to view all {data.length} records.
                        </div>
                    )}
                </div>
            ) : (
                !loading && !error && (
                    <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                        <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p>Select your criteria and click "Generate Report" to view data.</p>
                    </div>
                )
            )}
        </div>
    );
}
