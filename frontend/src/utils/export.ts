import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToCSV = (title: string, data: any[]) => {
    if (!data || data.length === 0) return;

    // Extract headers
    const headers = Object.keys(data[0]);

    // Format rows
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '""';
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const generatePDFReport = (title: string, data: any[], dateRangeString: string) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF('landscape');
    
    // Header text
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date Range: ${dateRangeString}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

    // Table data
    const headers = Object.keys(data[0]);
    const body = data.map(item => headers.map(header => item[header]?.toString() || ''));

    autoTable(doc, {
        head: [headers],
        body: body,
        startY: 42,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [211, 47, 47] }, // Brand Red
        alternateRowStyles: { fillColor: [249, 250, 251] },
        theme: 'grid'
    });

    const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};
