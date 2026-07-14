const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const oldBtnClass = 'class="w-full py-3.5 px-4 bg-slate-900 border border-slate-800/80 hover:bg-slate-850 hover:border-indigo-500/30 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2.5 transform hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"';
const newBtnClass = 'class="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 hover:border-emerald-400/60 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-100 font-bold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"';

code = code.replace(oldBtnClass, newBtnClass);
fs.writeFileSync('index.html', code);
