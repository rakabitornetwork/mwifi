import { Menu, Moon, Sun } from 'lucide-react';

export default function AdminNavbar({
    pageTitle,
    theme,
    isMobileMenuOpen,
    onOpenMobileMenu,
}) {
    const {
        themeHeader,
        themeHeaderTextTitle,
        themeHeaderBtn,
        isDarkMode,
        toggleTheme,
    } = theme;

    return (
        <header className={`h-14 ${themeHeader} flex items-center justify-between gap-3 px-4 sm:px-6 z-10 transition-colors duration-250`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    className={`p-1.5 rounded-lg border md:hidden cursor-pointer shrink-0 transition-colors ${themeHeaderBtn}`}
                    aria-label="Buka menu navigasi"
                    aria-expanded={isMobileMenuOpen}
                >
                    <Menu className="w-4 h-4" />
                </button>
                <h1 className={`text-xs sm:text-sm font-bold truncate ${themeHeaderTextTitle}`}>{pageTitle}</h1>
            </div>

            <button
                type="button"
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${themeHeaderBtn}`}
                aria-label="Ganti tema"
            >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
        </header>
    );
}
