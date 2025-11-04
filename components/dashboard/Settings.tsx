import React, { useState, Fragment } from 'react';
import { useApp } from '../../context/AppContext';
import { Branch, User, Role, Settings as SettingsType, NotificationTemplates } from '../../types';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';

type SettingsTab = 'general' | 'branches' | 'users' | 'customerUi' | 'notifications' | 'appearance';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};


const Settings: React.FC = () => {
    const { settings, setSettings, branches, updateBranch, addBranch, users, addUser, deleteBranch } = useApp();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    
    const [localSettings, setLocalSettings] = useState(settings);
    const [newUser, setNewUser] = useState({ name: '', mobile: '', password: '', role: Role.STAFF, branchId: branches[0]?.id || '' });
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 3000);
    };


    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const keys = name.split('.');
    
        const parsedValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                             type === 'number' ? parseInt(value, 10) || 0 : value;
    
        setLocalSettings(prev => {
            // Create a deep copy to avoid direct state mutation
            const newSettings = JSON.parse(JSON.stringify(prev));
            let currentLevel: any = newSettings;
    
            for (let i = 0; i < keys.length - 1; i++) {
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = parsedValue;
            
            return newSettings;
        });
    };

    const saveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSettings(localSettings);
            showToast('تم حفظ الإعدادات بنجاح!');
        } catch (error) {
            console.error("Failed to save settings:", error);
            showToast('حدث خطأ أثناء حفظ الإعدادات.', 'error');
        }
    };
    
    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if(newUser.name && newUser.mobile && newUser.password) {
             try {
                const normalizedMobile = newUser.mobile.startsWith('05') ? `+966${newUser.mobile.substring(1)}` : newUser.mobile;
                addUser({ ...newUser, mobile: normalizedMobile });
                setNewUser({ name: '', mobile: '', password: '', role: Role.STAFF, branchId: branches[0]?.id || '' });
                showToast('تم إضافة المستخدم بنجاح!');
            } catch (error) {
                console.error('Add user error:', error);
                showToast('حدث خطأ أثناء إضافة المستخدم.', 'error');
            }
        } else {
            showToast('يرجى تعبئة جميع الحقول لإضافة مستخدم.', 'error');
        }
    };

    const handleSaveBranch = (branchData: Branch) => {
        try {
            if(branches.some(b => b.id === branchData.id)) {
                updateBranch(branchData.id, branchData);
            } else {
                const { id, ...newBranchData } = branchData;
                addBranch(newBranchData);
            }
            setEditingBranch(null);
            showToast('تم حفظ بيانات الفرع بنجاح!');
        } catch (error) {
            console.error('Failed to save branch:', error);
            showToast('حدث خطأ أثناء حفظ بيانات الفرع.', 'error');
        }
    }

     const handleDeleteBranch = (branchId: string, branchName: string) => {
        if (window.confirm(`هل أنت متأكد من حذف فرع "${branchName}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
            try {
                deleteBranch(branchId);
                showToast(`تم حذف فرع "${branchName}" بنجاح!`);
            } catch (error) {
                console.error('Delete branch error:', error);
                showToast('حدث خطأ أثناء حذف الفرع.', 'error');
            }
        }
    };
    
    const renderGeneral = () => (
        <form onSubmit={saveSettings} className="space-y-4 max-w-xl">
            <div>
                <label className="block text-sm font-medium">اسم المطعم</label>
                <input type="text" name="restaurantName" value={localSettings.restaurantName} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
            </div>
            <div>
                <label className="block text-sm font-medium">رابط الشعار</label>
                <input type="text" name="logoUrl" value={localSettings.logoUrl} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
            </div>
            <div>
                <label className="block text-sm font-medium">رقم الواتساب (مع رمز الدولة)</label>
                <input type="text" name="whatsappNumber" value={localSettings.whatsappNumber} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
            </div>
            <button type="submit" className="btn-primary">حفظ الإعدادات العامة</button>
        </form>
    );
    
    const renderBranches = () => (
        <div>
             <button onClick={() => setEditingBranch({ id: '', name: '', location: '', imageUrl: '', googleMapsUrl: '', reviewUrl: '', isWaitlistEnabled: true, waitlistOpeningTime: '01:00 PM', waitlistClosingTime: '11:00 PM', isAppointmentEnabled: false, appointmentSettings: { availableSlots: [], availableDays: [] } })} className="btn-primary mb-4 flex items-center gap-2">
                <PlusIcon className="h-5 w-5" /> إضافة فرع جديد
            </button>
            <div className="space-y-4">
                {branches.map(branch => (
                    <div key={branch.id} className="p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <img src={branch.imageUrl} alt={branch.name} className="h-12 w-12 rounded-md object-cover"/>
                           <div>
                             <p className="font-semibold">{branch.name}</p>
                             <p className="text-sm text-gray-500">{branch.location}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setEditingBranch(branch)} className="flex items-center gap-2 text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
                                <PencilIcon className="h-4 w-4" /> <span>تعديل</span>
                            </button>
                             <button onClick={() => handleDeleteBranch(branch.id, branch.name)} className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
                                <TrashIcon className="h-4 w-4" /> <span>حذف</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {editingBranch && <BranchEditModal branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={handleSaveBranch} />}
        </div>
    );
    
    const renderUsers = () => {
        const formatMobileForDisplay = (mobile: string) => mobile.startsWith('+966') ? '0' + mobile.substring(4) : mobile;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-bold mb-3">إضافة مستخدم جديد</h3>
                    <form onSubmit={handleAddUser} className="space-y-3">
                        <input type="text" placeholder="الاسم" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full input-style" required />
                        <input type="tel" placeholder="رقم الجوال (05...)" value={newUser.mobile} onChange={e => setNewUser({...newUser, mobile: e.target.value})} className="w-full input-style" required />
                        <input type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full input-style" required />
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full input-style">
                            <option value={Role.STAFF}>موظف</option>
                            <option value={Role.ADMIN}>مدير</option>
                        </select>
                        {newUser.role === Role.STAFF && (
                            <select value={newUser.branchId} onChange={e => setNewUser({...newUser, branchId: e.target.value})} className="w-full input-style">
                               {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <button type="submit" className="w-full btn-primary">إضافة مستخدم</button>
                    </form>
                </div>
                 <div>
                    <h3 className="text-lg font-bold mb-3">المستخدمون الحاليون</h3>
                    <ul className="space-y-2">
                        {users.map(user => (
                            <li key={user.id} className="p-3 border dark:border-gray-700 rounded-lg flex justify-between items-center">
                                <div>
                                   <p className="font-semibold">{user.name}</p>
                                   <p className="text-xs text-gray-500">{formatMobileForDisplay(user.mobile)}</p>
                                </div>
                                <div className="text-right">
                                   <span className="text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400">{user.role === Role.ADMIN ? 'مدير' : 'موظف'}</span>
                                   {user.branchId !== 'all' && <p className="text-xs text-gray-500">{branches.find(b => b.id === user.branchId)?.name}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )
    };

    const renderCustomerUi = () => (
        <form onSubmit={saveSettings} className="space-y-6 max-w-xl">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium">رسالة الترحيب في الصفحة الرئيسية</label>
                <input type="text" name="customerUi.welcomeMessage" value={localSettings.customerUi.welcomeMessage} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
            </div>
             <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label htmlFor="maxGuests" className="block text-sm font-medium">الحد الأقصى لعدد الضيوف في الحجز الواحد</label>
                <input id="maxGuests" type="number" name="customerUi.maxGuests" value={localSettings.customerUi.maxGuests} onChange={handleSettingsChange} className="mt-1 block w-40 input-style" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="font-medium">تفعيل الحجوزات بشكل كامل؟</span>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" name="customerUi.bookingEnabled" className="sr-only" checked={localSettings.customerUi.bookingEnabled} onChange={handleSettingsChange} />
                        <div className={`block w-10 h-6 rounded-full ${localSettings.customerUi.bookingEnabled ? 'bg-fuchsia-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.customerUi.bookingEnabled ? 'transform translate-x-full' : ''}`}></div>
                    </div>
                </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="font-medium">إظهار خيار "منطقة الجلوس" للعميل؟</span>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" name="customerUi.showSeatingArea" className="sr-only" checked={localSettings.customerUi.showSeatingArea} onChange={handleSettingsChange} />
                        <div className={`block w-10 h-6 rounded-full ${localSettings.customerUi.showSeatingArea ? 'bg-fuchsia-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.customerUi.showSeatingArea ? 'transform translate-x-full' : ''}`}></div>
                    </div>
                </label>
            </div>
            <button type="submit" className="btn-primary">حفظ إعدادات الواجهة</button>
        </form>
    );
    
    const renderAppearance = () => (
         <form onSubmit={saveSettings} className="space-y-4">
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">اللون الأساسي</label>
                <input type="color" name="appearance.primaryColor" value={localSettings.appearance.primaryColor} onChange={handleSettingsChange} className="w-10 h-10" />
                <span>{localSettings.appearance.primaryColor}</span>
            </div>
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">اللون الثانوي</label>
                <input type="color" name="appearance.secondaryColor" value={localSettings.appearance.secondaryColor} onChange={handleSettingsChange} className="w-10 h-10" />
                <span>{localSettings.appearance.secondaryColor}</span>
            </div>
            <button type="submit" className="btn-primary">حفظ المظهر</button>
         </form>
    );

    const TemplateEditor: React.FC<{ provider: 'msegat' | 'karzoun' }> = ({ provider }) => {
        const templates = localSettings.notifications[provider].templates;
        
        const templateInfo: {key: keyof NotificationTemplates, label: string, description: string}[] = [
            { key: 'bookingConfirmation', label: 'رسالة تأكيد الحجز', description: 'تُرسل فوراً بعد أن يقوم العميل بإنشاء حجز جديد.' },
            { key: 'turnReminder', label: 'رسالة التذكير بقرب الدور', description: 'تُرسل عندما يصل العميل إلى الموقع المحدد في الإعدادات ضمن طابور الانتظار.' },
            { key: 'customerCall', label: 'رسالة نداء العميل', description: 'الرسالة الافتراضية التي تظهر عند الضغط على زر "نداء" من لوحة التحكم.' },
            { key: 'bookingSeated', label: 'رسالة عند جلوس العميل', description: 'تُرسل عند تغيير حالة الحجز إلى "تم الجلوس".' },
            { key: 'postVisitFeedback', label: 'رسالة شكر وطلب تقييم بعد الزيارة', description: 'تُرسل تلقائياً بعد تغيير حالة الحجز إلى "غادر العميل".' },
            { key: 'bookingCancelled', label: 'رسالة عند إلغاء الحجز', description: 'تُرسل عندما يتم إلغاء الحجز من قبل العميل أو الموظف.' },
        ];
        
        return (
            <div className="space-y-5">
                 {templateInfo.map(({ key, label, description }) => (
                    <div key={key} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <label className="block text-md font-semibold text-gray-800 dark:text-gray-200">{label}</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">{description}</p>
                        <textarea 
                            name={`notifications.${provider}.templates.${key}`} 
                            value={templates[key]} 
                            onChange={handleSettingsChange} 
                            rows={3} 
                            className="block w-full input-style" 
                        />
                    </div>
                ))}
            </div>
        );
    };
    
    const PlaceholdersInfo = () => (
      <div className="mb-6 p-4 border-l-4 border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-r-lg">
          <h4 className="font-bold text-fuchsia-800 dark:text-fuchsia-300">مساعدة: استخدام المتغيرات في الرسائل</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              يمكنك إدراج المعلومات الديناميكية تلقائيًا في رسائلك باستخدام المتغيرات التالية. سيتم استبدالها بالقيم الفعلية عند الإرسال:
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs" dir="ltr">
              <code className="placeholder-tag">{'{customerName}'}</code>
              <code className="placeholder-tag">{'{bookingId}'}</code>
              <code className="placeholder-tag">{'{branchName}'}</code>
              <code className="placeholder-tag">{'{restaurantName}'}</code>
              <code className="placeholder-tag">{'{queuePosition}'}</code>
              <code className="placeholder-tag">{'{waitTime}'}</code>
              <code className="placeholder-tag">{'{reviewLink}'}</code>
              <code className="placeholder-tag">{'{whatsappLink}'}</code>
          </div>
          <style>{`
            .placeholder-tag { 
                background-color: #f3e8ff; 
                color: #7e22ce; 
                padding: 0.25rem 0.5rem; 
                border-radius: 0.375rem; 
                font-family: monospace;
                font-weight: 600;
            }
            .dark .placeholder-tag {
                background-color: #581c87;
                color: #d8b4fe;
            }
        `}</style>
      </div>
    );

    const renderNotifications = () => (
        <form onSubmit={saveSettings} className="space-y-6 max-w-2xl">
            <PlaceholdersInfo />
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium">تفعيل إشعارات Msegat (SMS)</span>
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" name="notifications.msegat.enabled" className="sr-only" checked={localSettings.notifications.msegat.enabled} onChange={handleSettingsChange} />
                            <div className={`block w-10 h-6 rounded-full ${localSettings.notifications.msegat.enabled ? 'bg-fuchsia-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.notifications.msegat.enabled ? 'transform translate-x-full' : ''}`}></div>
                        </div>
                    </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium">تفعيل إشعارات Karzoun (WhatsApp)</span>
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" name="notifications.karzoun.enabled" className="sr-only" checked={localSettings.notifications.karzoun.enabled} onChange={handleSettingsChange} />
                            <div className={`block w-10 h-6 rounded-full ${localSettings.notifications.karzoun.enabled ? 'bg-fuchsia-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.notifications.karzoun.enabled ? 'transform translate-x-full' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>
            
            {localSettings.notifications.msegat.enabled && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4 transition-all duration-300">
                    <h3 className="text-lg font-bold">إعدادات Msegat SMS</h3>
                    <p className="text-sm text-gray-500">أدخل بيانات حسابك في <a href="https://msegat.docs.apiary.io/" target="_blank" rel="noopener noreferrer" className="text-fuchsia-500 hover:underline">Msegat</a> لتفعيل إشعارات الرسائل النصية.</p>
                    <div>
                        <label className="block text-sm font-medium">اسم المستخدم (Username)</label>
                        <input type="text" name="notifications.msegat.userName" value={localSettings.notifications.msegat.userName} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">مفتاح API (API Key)</label>
                        <input type="text" name="notifications.msegat.apiKey" value={localSettings.notifications.msegat.apiKey} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">اسم المرسل (User Sender)</label>
                        <input type="text" name="notifications.msegat.userSender" value={localSettings.notifications.msegat.userSender} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
                    </div>
                    <div className="pt-4 border-t dark:border-gray-600">
                         <h4 className="text-md font-bold mt-2">قوالب رسائل SMS</h4>
                         <TemplateEditor provider="msegat" />
                    </div>
                </div>
            )}
            
            {localSettings.notifications.karzoun.enabled && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4 transition-all duration-300">
                    <h3 className="text-lg font-bold">إعدادات Karzoun WhatsApp</h3>
                    <p className="text-sm text-gray-500">أدخل بيانات حسابك في Karzoun لتفعيل إشعارات الواتساب.</p>
                     <div>
                        <label className="block text-sm font-medium">App Key</label>
                        <input type="text" name="notifications.karzoun.appkey" value={localSettings.notifications.karzoun?.appkey || ''} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Auth Key</label>
                        <input type="text" name="notifications.karzoun.authkey" value={localSettings.notifications.karzoun?.authkey || ''} onChange={handleSettingsChange} className="mt-1 block w-full input-style" />
                    </div>
                     <div className="pt-4 border-t dark:border-gray-600">
                         <h4 className="text-md font-bold mt-2">قوالب رسائل WhatsApp</h4>
                         <TemplateEditor provider="karzoun" />
                    </div>
                </div>
            )}

            {(localSettings.notifications.msegat.enabled || localSettings.notifications.karzoun.enabled) && (
             <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                 <h3 className="text-lg font-bold">إعدادات عامة للإشعارات</h3>
                 <div className="mt-4">
                    <label className="block text-sm font-medium">إرسال تذكير "قرب الدور" عندما يكون العميل في الدور رقم</label>
                     <input type="number" name="notifications.remindWhenQueuePositionIs" value={localSettings.notifications.remindWhenQueuePositionIs} onChange={handleSettingsChange} className="mt-1 block w-24 input-style" />
                </div>
            </div>
            )}

            <button type="submit" className="btn-primary mt-4">حفظ إعدادات الإشعارات</button>
        </form>
    );

    return (
        <Fragment>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <style>{`.input-style { border-radius: 0.5rem; border: 1px solid; border-color: rgb(209 213 219); background-color: rgb(249 250 251); padding: 0.5rem 1rem;} .dark .input-style { border-color: rgb(75 85 99); background-color: rgb(55 65 81); } .btn-primary { background-color: #c026d3; color: white; font-weight: bold; padding: 0.5rem 1rem; border-radius: 0.5rem; } .btn-primary:hover { background-color: #a21caf; }`}</style>
                <div className="flex border-b dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab('general')} className={`tab-btn ${activeTab === 'general' && 'active'}`}>عامة</button>
                    <button onClick={() => setActiveTab('branches')} className={`tab-btn ${activeTab === 'branches' && 'active'}`}>الفروع</button>
                    <button onClick={() => setActiveTab('users')} className={`tab-btn ${activeTab === 'users' && 'active'}`}>المستخدمين</button>
                    <button onClick={() => setActiveTab('customerUi')} className={`tab-btn ${activeTab === 'customerUi' && 'active'}`}>واجهة العميل</button>
                    <button onClick={() => setActiveTab('notifications')} className={`tab-btn ${activeTab === 'notifications' && 'active'}`}>الإشعارات والرسائل</button>
                    <button onClick={() => setActiveTab('appearance')} className={`tab-btn ${activeTab === 'appearance' && 'active'}`}>المظهر</button>
                </div>
                
                <div className="p-1 sm:p-4">
                    {activeTab === 'general' && renderGeneral()}
                    {activeTab === 'branches' && renderBranches()}
                    {activeTab === 'users' && renderUsers()}
                    {activeTab === 'customerUi' && renderCustomerUi()}
                    {activeTab === 'notifications' && renderNotifications()}
                    {activeTab === 'appearance' && renderAppearance()}
                </div>
                <style>{`
                    .tab-btn { padding: 0.75rem 1rem; border-bottom: 2px solid transparent; color: #6b7280; font-weight: 500; white-space: nowrap;}
                    .dark .tab-btn { color: #9ca3af; }
                    .tab-btn:hover { border-color: #d1d5db; color: #111827; }
                    .dark .tab-btn:hover { border-color: #4b5563; color: #f9fafb; }
                    .tab-btn.active { border-color: #c026d3; color: #c026d3; }
                    .dark .tab-btn.active { color: #f0abfc; }
                `}</style>
            </div>
             {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 py-2 px-6 rounded-full shadow-lg text-white text-sm font-semibold z-[100] ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-fade-in-out`}>
                    {toast.message}
                </div>
            )}
            <style>{`
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    10% { opacity: 1; transform: translate(-50%, 0); }
                    90% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, 20px); }
                }
                .animate-fade-in-out {
                    animation: fade-in-out 3s ease-in-out forwards;
                }
            `}</style>
        </Fragment>
    );
};

const BranchEditModal: React.FC<{ branch: Branch; onClose: () => void; onSave: (branch: Branch) => void; }> = ({ branch, onClose, onSave }) => {
    const [localBranch, setLocalBranch] = useState(branch);
    const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setLocalBranch(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
    
    const handleDayChange = (dayIndex: number, isChecked: boolean) => {
        const currentDays = localBranch.appointmentSettings.availableDays || [];
        const newDays = isChecked
            ? [...currentDays, dayIndex]
            : currentDays.filter(d => d !== dayIndex);
        
        setLocalBranch(prev => ({
            ...prev,
            appointmentSettings: { ...prev.appointmentSettings, availableDays: newDays.sort() }
        }));
    }

    const handleSlotChange = (index: number, field: 'time' | 'capacity', value: string) => {
        const newSlots = [...localBranch.appointmentSettings.availableSlots];
        newSlots[index] = { ...newSlots[index], [field]: field === 'capacity' ? parseInt(value, 10) || 0 : value };
        setLocalBranch(prev => ({...prev, appointmentSettings: { ...prev.appointmentSettings, availableSlots: newSlots }}));
    }

    const addSlot = () => {
        const newSlots = [...localBranch.appointmentSettings.availableSlots, { time: '10:00 PM', capacity: 5 }];
        setLocalBranch(prev => ({...prev, appointmentSettings: { ...prev.appointmentSettings, availableSlots: newSlots }}));
    }

    const removeSlot = (index: number) => {
        const newSlots = localBranch.appointmentSettings.availableSlots.filter((_, i) => i !== index);
        setLocalBranch(prev => ({...prev, appointmentSettings: { ...prev.appointmentSettings, availableSlots: newSlots }}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(localBranch);
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={branch.id ? `تعديل فرع ${branch.name}` : 'إضافة فرع جديد'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">اسم الفرع</label>
                        <input type="text" name="name" value={localBranch.name} onChange={handleChange} className="mt-1 block w-full input-style" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">الموقع</label>
                        <input type="text" name="location" value={localBranch.location} onChange={handleChange} className="mt-1 block w-full input-style" required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">رابط الصورة</label>
                    <input type="text" name="imageUrl" value={localBranch.imageUrl} onChange={handleChange} className="mt-1 block w-full input-style" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium">رابط تقييم جوجل (اختياري)</label>
                    <input type="url" name="reviewUrl" value={localBranch.reviewUrl || ''} onChange={handleChange} className="mt-1 block w-full input-style" placeholder="https://maps.app.goo.gl/..." />
                </div>
                <div>
                    <label className="block text-sm font-medium">رابط خرائط جوجل (اختياري)</label>
                    <input type="url" name="googleMapsUrl" value={localBranch.googleMapsUrl || ''} onChange={handleChange} className="mt-1 block w-full input-style" placeholder="https://maps.app.goo.gl/..." />
                </div>
                <div className="flex gap-8 items-start">
                     <div className="pt-2">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" name="isWaitlistEnabled" className="h-4 w-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500" checked={localBranch.isWaitlistEnabled} onChange={handleChange} />
                            <span className="mr-2 text-sm">تفعيل قائمة الانتظار</span>
                        </label>
                    </div>
                    {localBranch.isWaitlistEnabled && (
                        <div className="p-4 border dark:border-gray-600 rounded-lg flex-grow">
                            <h4 className="font-semibold mb-2 text-sm">أوقات عمل قائمة الانتظار</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium">وقت الفتح</label>
                                    <input type="text" name="waitlistOpeningTime" value={localBranch.waitlistOpeningTime || ''} onChange={handleChange} className="mt-1 block w-full input-style text-sm" placeholder="e.g., 01:00 PM" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium">وقت الإغلاق</label>
                                    <input type="text" name="waitlistClosingTime" value={localBranch.waitlistClosingTime || ''} onChange={handleChange} className="mt-1 block w-full input-style text-sm" placeholder="e.g., 11:00 PM" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                 <div className="pt-2">
                     <label className="flex items-center cursor-pointer">
                        <input type="checkbox" name="isAppointmentEnabled" className="h-4 w-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500" checked={localBranch.isAppointmentEnabled} onChange={handleChange} />
                        <span className="mr-2 text-sm">تفعيل حجز المواعيد</span>
                    </label>
                </div>

                {localBranch.isAppointmentEnabled && (
                    <div className="p-4 border dark:border-gray-600 rounded-lg space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">الأيام المتاحة للحجز المسبق</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {daysOfWeek.map((day, index) => (
                                    <label key={index} className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500"
                                            checked={localBranch.appointmentSettings.availableDays?.includes(index)}
                                            onChange={(e) => handleDayChange(index, e.target.checked)}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="border-t dark:border-gray-600 pt-4">
                            <h4 className="font-semibold mb-2">الأوقات المتاحة (نظام 12 ساعة)</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                               {localBranch.appointmentSettings.availableSlots.map((slot, index) => (
                                   <div key={index} className="flex items-center gap-2">
                                       <input type="text" value={slot.time} onChange={e => handleSlotChange(index, 'time', e.target.value)} className="input-style w-32" placeholder="e.g., 07:00 PM" />
                                       <input type="number" value={slot.capacity} onChange={e => handleSlotChange(index, 'capacity', e.target.value)} className="input-style w-24" placeholder="السعة"/>
                                       <button type="button" onClick={() => removeSlot(index)} className="text-red-500 hover:text-red-700 p-1">
                                           <TrashIcon className="h-5 w-5" />
                                       </button>
                                   </div>
                               ))}
                            </div>
                             <button type="button" onClick={addSlot} className="mt-2 text-sm flex items-center gap-1 text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                                <PlusIcon className="h-4 w-4"/> إضافة وقت
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">إلغاء</button>
                    <button type="submit" className="btn-primary">حفظ التغييرات</button>
                </div>
            </form>
        </Modal>
    );
}

export default Settings;