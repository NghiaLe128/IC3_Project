const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf-8');

const inserts = [
  { target: '</table>\n            </div>\n          </div>\n        </section>\n\n        <!-- Tab: Teachers -->', 
    replace: '</table>\n            </div>\n            <div id="students-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n          </div>\n        </section>\n\n        <!-- Tab: Teachers -->' },
  { target: '<div id="teachers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n            <!-- Injected dynamically -->\n          </div>\n        </section>',
    replace: '<div id="teachers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n            <!-- Injected dynamically -->\n          </div>\n          <div id="teachers-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n        </section>'},
  { target: '</table>\n            </div>\n          </div>\n        </section>\n\n        <!-- Tab: Tests -->',
    replace: '</table>\n            </div>\n            <div id="questions-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n          </div>\n        </section>\n\n        <!-- Tab: Tests -->' },
  { target: '<div id="tests-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">\n            <!-- Injected dynamically -->\n          </div>\n        </section>',
    replace: '<div id="tests-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">\n            <!-- Injected dynamically -->\n          </div>\n          <div id="tests-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n        </section>' },
  { target: '<div id="ranking-list" class="space-y-3">\n              <!-- Injected dynamically -->\n            </div>\n          </div>\n        </section>',
    replace: '<div id="ranking-list" class="space-y-3">\n              <!-- Injected dynamically -->\n            </div>\n            <div id="ranking-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n          </div>\n        </section>' },
  { target: '<div id="rewards-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">\n            <!-- Injected dynamically -->\n          </div>\n        </section>',
    replace: '<div id="rewards-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">\n            <!-- Injected dynamically -->\n          </div>\n          <div id="rewards-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n        </section>' },
  { target: '<div id="bosses-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n            <!-- Injected dynamically -->\n          </div>\n        </section>',
    replace: '<div id="bosses-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n            <!-- Injected dynamically -->\n          </div>\n          <div id="bosses-pagination" class="flex justify-center items-center mt-6 gap-2"></div>\n        </section>' }
];

inserts.forEach(ins => {
  html = html.replace(ins.target, ins.replace);
});

fs.writeFileSync('admin/index.html', html);
