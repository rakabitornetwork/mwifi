import { router, usePage } from '@inertiajs/react';
import { Image as ImageIcon, Mail, Save, User } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import BrandingFileUpload from '../../../Components/Admin/BrandingFileUpload';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

function ProfilePageContent() {
    const { auth } = usePage().props;
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();

    const themeInput = theme.isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = theme.isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const handleSaveProfile = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const avatarInput = form.querySelector('input[name="avatar"]');
        if (avatarInput?.files?.[0]) {
            formData.set('avatar', avatarInput.files[0]);
        }

        router.post('/admin/profile/save', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => router.reload(),
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan profil administrator.', 'error');
            },
        });
    };

    return (
        <form
            key={`profile-${auth.user.updated_at || auth.user.id}`}
            onSubmit={handleSaveProfile}
            encType="multipart/form-data"
            className={`${theme.themeCard} border rounded-2xl p-5 space-y-5 max-w-4xl`}
        >
            <div className={`flex items-center gap-2 border-b ${theme.isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                <User className="w-5 h-5 text-indigo-500" />
                <div>
                    <h3 className={`text-sm font-bold ${theme.themeTextTitle}`}>Profil Administrator</h3>
                    <p className={`text-[10px] ${theme.themeTextSub} mt-0.5`}>Kelola nama, email, jabatan, kata sandi, dan foto profil Anda.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                <div className={`border rounded-xl p-4 space-y-3 ${theme.isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span className={`font-bold ${theme.themeTextTitle}`}>Avatar Profil</span>
                    </div>
                    <div className="flex justify-center">
                        {auth.user.avatar_url ? (
                            <img
                                src={auth.user.avatar_url}
                                alt={auth.user.name}
                                className="w-24 h-24 rounded-2xl object-cover"
                            />
                        ) : (
                            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-2xl ${theme.isDarkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-indigo-700 border border-zinc-200'}`}>
                                {auth.user.initials || '?'}
                            </div>
                        )}
                    </div>
                    <BrandingFileUpload
                        key={`avatar-upload-${auth.user.updated_at || auth.user.id}`}
                        name="avatar"
                        accept="image/png,image/jpeg,image/webp"
                        buttonLabel="Pilih & Upload Avatar"
                        hint="Format: PNG, JPG, WEBP · Maks. 2MB · Tampil di sidebar admin."
                        isDarkMode={theme.isDarkMode}
                    />
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nama Lengkap</label>
                            <input name="name" type="text" defaultValue={auth.user.name || ''} required className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Email Login</label>
                            <div className="relative">
                                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                <input name="email" type="email" defaultValue={auth.user.email || ''} required className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Jabatan / Label Role</label>
                        <input
                            name="profile_title"
                            type="text"
                            defaultValue={auth.user.profile_title || 'Super Admin'}
                            placeholder="Super Admin"
                            className={`p-2 border rounded-lg ${themeInput}`}
                        />
                        <span className={`text-[10px] ${theme.themeTextDesc}`}>Teks kecil di bawah nama pada sidebar (mis. Super Admin, NOC Manager).</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Kata Sandi Baru</label>
                            <input name="password" type="password" placeholder="Kosongkan jika tidak diubah" autoComplete="new-password" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Konfirmasi Kata Sandi</label>
                            <input name="password_confirmation" type="password" placeholder="Ulangi kata sandi baru" autoComplete="new-password" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-md">
                    <Save className="w-4 h-4" />
                    <span>Simpan Profil</span>
                </button>
            </div>
        </form>
    );
}

export default function ProfileIndex() {
    return (
        <AdminLayout title="Profil Administrator">
            <ProfilePageContent />
        </AdminLayout>
    );
}
