const fs = require('fs');
let code = fs.readFileSync('teacher/script.js', 'utf-8');

code = code.replace(`          // Allow authentication
          users.push({
            email: email,
            password: "123456",
            role: "student",
            name: name
          });
          count++;
        }
      });`, `          // Allow authentication
          users.push({
            email: email,
            password: "123456",
            role: "student",
            name: name
          });
          importedEmails.push(email);
          count++;
        }
      });
      window.saveData(window.IC3_KEYS.STUDENTS, students, importedEmails);`);

code = code.replace(`      const users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];`, `      const users = window.IC3_CACHE[window.IC3_KEYS.USERS] || [];
      const importedEmails = [];`);

code = code.replace(`      window.saveData(window.IC3_KEYS.USERS, users);`, `      window.saveData(window.IC3_KEYS.USERS, users, importedEmails);`);

fs.writeFileSync('teacher/script.js', code);
