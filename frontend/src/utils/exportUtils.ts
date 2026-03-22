import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Dynamically generates a CSV string from an array of objects and triggers a download.
 */
export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
    }

    // Extract headers
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Push header row
    csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));

    // Push data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            return `"${val.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Create a link and trigger download
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename.endsWith('.csv') ? filename : `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Generates a PDF report using jsPDF and autoTable.
 */
export function exportToPDF(data: any[], columns: string[] | undefined | null, filename: string, title: string) {
    if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
    }

    const doc = new jsPDF();

    const pageTitle = `EuOnTour - ${title} Report`;
    const dateStr = `Generated on: ${new Date().toLocaleString()}`;

    // Add Title
    doc.setFontSize(18);
    doc.text(pageTitle, 14, 22);

    // Add Date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(dateStr, 14, 30);

    const tableColumns = (columns && columns.length > 0) ? columns : Object.keys(data[0]);

    // Map data to match columns
    const tableData = data.map(item => tableColumns.map(col => item[col] || ''));

    // Render Table
    autoTable(doc, {
        head: [tableColumns],
        body: tableData,
        startY: 36,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [211, 47, 47] } // brand-red roughly
    });

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(finalFilename);
}
