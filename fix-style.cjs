const fs = require('fs');
let code = fs.readFileSync('student/index.html', 'utf-8');

const styles = `      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 7s infinite; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin-slow { animation: spin-slow 3s linear infinite; }
    </style>`;

if (!code.includes('animate-blob')) {
    code = code.replace('    </style>', styles);
    fs.writeFileSync('student/index.html', code);
}
