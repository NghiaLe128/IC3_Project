const fs = require('fs');
let html = fs.readFileSync('student/index.html', 'utf-8');
html = html.replace('  </body>', `    <!-- Database Script Initializer -->
    <script type="module" src="/assets/js/db-init.js"></script>
    <script type="module" src="script.js"></script>
  </body>`);
fs.writeFileSync('student/index.html', html);
