//
// Note: This is a partial update. The user's prompt will be used to generate the full content of the file.
//
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { BookingStatus } from '../../types';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import WaitTimeChart from './WaitTimeChart';

const Archive: React.FC = () => {
    const { bookings, branches, getWaitTimeStats } = useApp();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState<{ year: number | 'all', month: number | 'all' }>({
        year: new Date().getFullYear(),
        month: 'all',
    });
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'visitCount'; direction: 'ascending' | 'descending' }>({
        key: 'visitCount',
        direction: 'descending',
    });

    const formatMobileForDisplay = (mobile: string) => mobile.startsWith('+966') ? '0' + mobile.substring(4) : mobile;

    const { years, months } = useMemo(() => {
        const endYear = new Date().getFullYear();
        const startYear = 2020;
        const yearsList = [];
        for (let y = endYear; y >= startYear; y--) {
            yearsList.push(y);
        }
        
        const monthsList = [
            { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
            { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
            { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
            { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
        ];
        return { years: yearsList, months: monthsList };
    }, []);
    
    const filteredBookingsByDateAndBranch = useMemo(() => {
        return bookings.filter(b => {
            const isStaffForAnotherBranch = user?.branchId !== 'all' && b.branchId !== user?.branchId;
            if (isStaffForAnotherBranch) return false;

            if (filterDate.year !== 'all') {
                if (new Date(b.createdAt).getFullYear() !== filterDate.year) return false;
            }
            if (filterDate.month !== 'all') {
                if (new Date(b.createdAt).getMonth() + 1 !== filterDate.month) return false;
            }
            return true;
        });
    }, [bookings, user, filterDate]);


    const archivedBookings = useMemo(() => {
        return filteredBookingsByDateAndBranch
            .filter(b => (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CANCELLED) &&
                (searchTerm === '' || b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.mobile.includes(searchTerm)))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [filteredBookingsByDateAndBranch, searchTerm]);

    const customerLog = useMemo(() => {
        const customers = new Map<string, { name: string; mobile: string; visitCount: number }>();
        filteredBookingsByDateAndBranch.forEach(b => {
            if (b.status === BookingStatus.COMPLETED) {
                if (customers.has(b.mobile)) {
                    customers.get(b.mobile)!.visitCount++;
                } else {
                    customers.set(b.mobile, { name: b.name, mobile: b.mobile, visitCount: 1 });
                }
            }
        });
        
        let sortedCustomers = Array.from(customers.values());
        
        sortedCustomers.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        return sortedCustomers;
    }, [filteredBookingsByDateAndBranch, sortConfig]);

    const waitTimeChartData = useMemo(() => {
        if (filterDate.year === 'all') {
            return [];
        }
        return getWaitTimeStats(filterDate.year, filterDate.month, user?.branchId || 'all');
    }, [filterDate.year, filterDate.month, user?.branchId, getWaitTimeStats]);

    const chartTitle = useMemo(() => {
        if (filterDate.year === 'all') return "الرجاء تحديد سنة لعرض الإحصائيات";
        
        const monthName = filterDate.month !== 'all' 
            ? months.find(m => m.value === filterDate.month)?.label 
            : '';
        
        const branchName = user?.branchId === 'all' 
            ? "لجميع الفروع" 
            : `لفرع ${branches.find(b => b.id === user?.branchId)?.name}`;
        
        return `متوسط وقت الانتظار المتوقع ${monthName ? `لشهر ${monthName}` : ''} عام ${filterDate.year} ${branchName}`;

    }, [filterDate, user, months, branches]);

    const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name || 'غير معروف';

    const handleSort = (key: 'name' | 'visitCount') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const exportToCsv = () => {
        if (customerLog.length === 0) {
            alert("لا توجد بيانات لتصديرها.");
            return;
        }
        const headers = ['Name', 'Mobile', 'VisitCount'];
        const rows = customerLog.map(c => [c.name, formatMobileForDisplay(c.mobile), c.visitCount]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `customer_log_${filterDate.year}_${filterDate.month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="space-y-8">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">تحليل أوقات الانتظار</h2>
                     <div className="flex items-center gap-3 mt-3 sm:mt-0">
                        <select value={filterDate.year} onChange={(e) => setFilterDate(p => ({ ...p, year: e.target.value === 'all' ? 'all' : Number(e.target.value) }))} className="input-style">
                            <option value="all">كل السنوات</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                         <select value={filterDate.month} onChange={(e) => setFilterDate(p => ({ ...p, month: e.target.value === 'all' ? 'all' : Number(e.target.value) }))} className="input-style">
                            <option value="all">كل الشهور</option>
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                </div>
                 <WaitTimeChart 
                    data={waitTimeChartData} 
                    title={chartTitle}
                    unit="دقيقة"
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-4">أرشيف الحجوزات</h2>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الجوال..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full mb-4 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                    />
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="p-3">الاسم</th>
                                        <th className="p-3">الجوال</th>
                                        <th className="p-3">الفرع</th>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {archivedBookings.length > 0 ? archivedBookings.map(b => (
                                        <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 font-medium">{b.name}</td>
                                            <td className="p-3">{formatMobileForDisplay(b.mobile)}</td>
                                            <td className="p-3">{getBranchName(b.branchId)}</td>
                                            <td className="p-3">{new Date(b.createdAt).toLocaleDateString('ar-SA')}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                    {b.status === BookingStatus.COMPLETED ? 'مكتمل' : 'ملغي'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan={5} className="text-center p-4 text-gray-500">لا توجد حجوزات مؤرشفة تطابق البحث.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div>
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">سجل العملاء (CRM)</h2>
                        <button onClick={exportToCsv} className="text-sm bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-300 font-semibold py-1 px-3 rounded-md hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900">
                            تصدير
                        </button>
                    </div>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">يعرض هذا السجل العملاء الذين أتموا زياراتهم بنجاح خلال الفترة المحددة في فلاتر "تحليل أوقات الانتظار" أعلاه.</p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[50vh] overflow-y-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 z-10">
                                 <tr>
                                    <th className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('name')}>
                                        <div className="flex justify-between items-center">
                                            <span>الاسم</span>
                                            {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                                        </div>
                                    </th>
                                    <th className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('visitCount')}>
                                         <div className="flex justify-between items-center">
                                            <span>عدد الزيارات</span>
                                            {sortConfig.key === 'visitCount' && (sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {customerLog.length > 0 ? customerLog.map(c => (
                                    <tr key={c.mobile} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3">
                                            <p className="font-semibold">{c.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatMobileForDisplay(c.mobile)}</p>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="font-bold text-lg text-fuchsia-600 dark:text-fuchsia-400">{c.visitCount}</span>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="text-center p-4 text-gray-500">لا يوجد عملاء مطابقين للتصفية.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                     <style>{`.input-style { border-radius: 0.5rem; border: 1px solid; border-color: rgb(209 213 219); background-color: rgb(249 250 251); padding: 0.5rem 1rem;} .dark .input-style { border-color: rgb(75 85 99); background-color: rgb(55 65 81); }`}</style>
                </div>
            </div>
        </div>
    );
};

export default Archive;