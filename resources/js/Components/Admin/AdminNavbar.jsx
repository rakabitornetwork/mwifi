import { Menu, Moon, Sun } from 'lucide-react';

export default function AdminNavbar({
    pageTitle,
    theme,
    isMobileMenuOpen,
    menuButtonRef,
    onOpenMobileMenu,
}) {
    const {
        themeHeader,
        themeHeaderTextTitle,
        themeHeaderBtn,
        isDarkMode,
        isAutoTheme,
        toggleTheme,
    } = theme;

    return (
        <header className={`admin-topbar ${themeHeader} flex items-center justify-between gap-3 px-4 sm:px-6 z-10 transition-colors duration-250`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                    type="button"
                    ref={menuButtonRef}
                    onClick={onOpenMobileMenu}
                    className={`p-1.5 rounded-lg border md:hidden cursor-pointer shrink-0 transition-colors ${themeHeaderBtn}`}
                    aria-label="Buka menu navigasi"
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="admin-mobile-nav"
                >
                    <Menu className="w-4 h-4" />
                </button>
                <h1 className={`text-xs sm:text-sm font-bold truncate ${themeHeaderTextTitle}`}>{pageTitle}</h1>
            </div>

            <button
                type="button"
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer shrink-0 ${
                    isDarkMode
                        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.2)]'
                        : 'border-white/22 bg-white/10 text-yellow-100 hover:bg-white/18 hover:text-white hover:border-white/32 shadow-sm'
                }`}
                aria-label={isAutoTheme ? 'Tema otomatis mengikuti waktu. Klik untuk ganti.' : 'Ganti tema'}
                title={isAutoTheme ? 'Otomatis (06:00–18:00 terang)' : undefined}
            >
                {isDarkMode ? (
                    <Sun className="w-4 h-4 fill-yellow-400/25" />
                ) : (
                    <Moon className="w-4 h-4 fill-yellow-100/20" />
                )}
            </button>
        </header>
    );
}
