const fs = require('fs');
let code = fs.readFileSync('student/index.html', 'utf-8');
const shimmer = `      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
    </style>`;
if (!code.includes('@keyframes shimmer')) {
    code = code.replace('    </style>', shimmer);
    fs.writeFileSync('student/index.html', code);
}
