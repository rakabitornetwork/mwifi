import { useState } from 'react';
import { Upload } from 'lucide-react';

export default function BrandingFileUpload({ name, accept, buttonLabel, hint, isDarkMode }) {
    const [fileName, setFileName] = useState('');

    const buttonClass = isDarkMode
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/60'
        : 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500';

    const hintClass = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
    const fileNameClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-700';

    return (
        <div className="space-y-2 pt-1">
            <label
                className={`inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg border-2 border-dashed font-semibold text-xs cursor-pointer transition-colors ${buttonClass}`}
            >
                <Upload className="w-4 h-4 shrink-0" />
                <span>{buttonLabel}</span>
                <input
                    type="file"
                    name={name}
                    accept={accept}
                    className="sr-only"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                />
            </label>
            {fileName && (
                <p className={`text-[10px] font-medium truncate ${fileNameClass}`}>
                    File dipilih: {fileName}
                </p>
            )}
            <p className={`text-[10px] leading-relaxed border-t pt-2 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} ${hintClass}`}>
                {hint}
            </p>
        </div>
    );
}
