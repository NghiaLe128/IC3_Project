const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// The closing tags currently are:
//             </div>
//           </div>
//         </div>
//       </div>
//     </main>

// We need to inject the View 2 just before the last 3 closing divs (for loginSlider, glassmorphism, right-side).

const injection = `
            </div> <!-- End View 1 -->

            <!-- View 2: Sheet Login Form -->
            <div class="w-1/2 flex-shrink-0 p-8 relative flex flex-col">
              <button type="button" onclick="document.getElementById('loginSlider').style.transform = 'translateX(0%)'" class="absolute top-6 left-6 text-indigo-300 hover:text-indigo-100 transition-colors">
                <i class="fa-solid fa-arrow-left text-lg"></i>
              </button>
              
              <div class="text-center mb-6 mt-4">
                <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mx-auto mb-3">
                  📊
                </div>
                <h3 class="font-poppins font-black text-xl text-white">Lớp học Sheet</h3>
                <p class="text-xs text-indigo-300 mt-1">Vui lòng chọn thông tin của bạn</p>
                <p id="googleUserEmailDisplay" class="hidden text-xs text-indigo-300 mt-1">user@gmail.com</p>
              </div>

              <form id="googleSheetLoginForm" class="space-y-4">
                <!-- School Dropdown -->
                <div>
                  <label class="block text-xs font-bold text-indigo-300 uppercase mb-1.5">Chọn Trường học</label>
                  <select id="sheetSchoolSelect" required onchange="onSheetSchoolChange()"
                    class="w-full bg-slate-900/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm">
                    <option value="">-- Chọn trường học --</option>
                  </select>
                </div>

                <!-- Class Dropdown -->
                <div>
                  <label class="block text-xs font-bold text-indigo-300 uppercase mb-1.5">Chọn Lớp học</label>
                  <select id="sheetClassSelect" required onchange="onSheetClassChange()"
                    class="w-full bg-slate-900/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm">
                    <option value="">-- Chọn lớp học --</option>
                  </select>
                </div>

                <!-- Student Name Dropdown -->
                <div>
                  <label class="block text-xs font-bold text-indigo-300 uppercase mb-1.5">Học sinh (Tên học sinh)</label>
                  <select id="sheetStudentSelect" required
                    class="w-full bg-slate-900/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm">
                    <option value="">-- Chọn học sinh --</option>
                  </select>
                </div>

                <!-- Password input -->
                <div>
                  <label class="block text-xs font-bold text-indigo-300 uppercase mb-1.5">Mật khẩu học sinh</label>
                  <div class="relative">
                    <input type="password" id="sheetPassword" required placeholder="Nhập mật khẩu do Giáo viên cấp"
                      class="w-full bg-slate-900/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm">
                    <button type="button" onclick="toggleSheetPassword()" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      <i id="sheetEyeIcon" class="fa-regular fa-eye"></i>
                    </button>
                  </div>
                </div>

                <!-- Error container -->
                <div id="sheetLoginError" class="hidden p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <i class="fa-solid fa-circle-exclamation shrink-0"></i>
                  <span id="sheetLoginErrorMessage">Mật khẩu không chính xác!</span>
                </div>

                <div class="pt-2">
                  <button type="submit" id="sheetSubmitBtn"
                    class="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold shadow-lg shadow-indigo-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Xác nhận Đăng nhập <i class="fa-solid fa-arrow-right ml-1"></i>
                  </button>
                </div>
              </form>
            </div> <!-- End View 2 -->
          </div> <!-- End loginSlider -->
`;

code = code.replace(/            <\/div>\n          <\/div>\n\n        <\/div>\n      <\/div>\n    <\/main>/, injection + "\n        </div>\n      </div>\n    </main>");
code = code.replace(/            <\/div>\n          <\/div>\n        <\/div>\n      <\/div>\n    <\/main>/, injection + "\n        </div>\n      </div>\n    </main>");

fs.writeFileSync('index.html', code);
