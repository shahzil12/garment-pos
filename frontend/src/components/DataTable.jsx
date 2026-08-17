import React from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const DataTable = ({
    columns,
    data = [],
    loading = false,
    search = '',
    onSearchChange,
    searchPlaceholder = 'Search...',
    pagination = null, // { current_page, last_page, total, per_page, onPageChange }
    csvData = null, // Array of objects or callback to trigger CSV export
    csvHeaders = [], // Array of string column headers
    csvFileName = 'export.csv',
    filterComponent = null,
}) => {

    const exportToCSV = () => {
        if (!csvData || csvData.length === 0) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += csvHeaders.join(",") + "\r\n";

        // Add rows
        csvData.forEach((row) => {
            const rowValues = row.map(val => {
                if (val === null || val === undefined) return '""';
                // Escape double quotes
                const stringVal = String(val).replace(/"/g, '""');
                return `"${stringVal}"`;
            });
            csvContent += rowValues.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", csvFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
            {/* Header controls */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex-1 max-w-sm">
                    {onSearchChange && (
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 transition-all duration-150"
                        />
                    )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    {filterComponent}
                    
                    {csvData && (
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all duration-150"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-6 py-4 font-semibold">
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading data...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                    No records found.
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-all duration-100">
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                                            {col.render
                                                ? col.render(row[col.accessor], row)
                                                : row[col.accessor] !== null && row[col.accessor] !== undefined
                                                ? String(row[col.accessor])
                                                : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.last_page > 1 && (
                <div className="p-5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing page <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.current_page}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.last_page}</span> (Total {pagination.total} records)
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={pagination.current_page === 1}
                            onClick={() => pagination.onPageChange(pagination.current_page - 1)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() => pagination.onPageChange(pagination.current_page + 1)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
