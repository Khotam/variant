import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('uz') ? 'uz' : 'en';

  const toggle = () => {
    const next = current === 'en' ? 'uz' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
    >
      <span className={current === 'en' ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
        EN
      </span>
      <span className="text-slate-300">|</span>
      <span className={current === 'uz' ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
        UZ
      </span>
    </button>
  );
}
