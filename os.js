let terminal, inputLine = '';
let startTime, timerInterval, elapsed = 0;
let historyIndex = -1;
let cursorPosition = 0;
let AlreadyLogin = false;
let showUnderscore = false;

const history = [];  

const taskbar = document.createElement('div');
taskbar.id = 'taskbar';
document.body.appendChild(taskbar);

let fileSystem = JSON.parse(localStorage.getItem("webTestOS_FS")) || {
  "readme.txt": "Welcome to the WebTest OS!",
  "example.js": "alert('Hello from script.js');",
  "example.ws": "echo Hello World!",
  "calc.js": 
    `const content = ' <input type="text" id="calcInput" placeholder="Enter expression" style="width: 100%; background: #222; color: #fff; border: none; padding: 5px;" /> <div id="calcResult" style="margin-top: 5px; color: #0f0;"></div> ';
    const win = createWindow("https://cdn2.iconfinder.com/data/icons/ios7-inspired-mac-icon-set/512/Calculator_512.png", "Calculator", content);
  
    setTimeout(() => {
      const input = win.querySelector("#calcInput");
      const result = win.querySelector("#calcResult");
  
      input.addEventListener("keydown", (e) => {
        e.stopPropagation(); 
        if (e.key === "Enter") {
          try {
            result.textContent = "Result: " + eval(input.value);
          } catch (err) {
            result.textContent = "Error: " + err.message;
          }
        }
      });
    }, 0);`
  ,
  "editor.js": `const content0 = '<textarea style="width: 100%; height: 100%; background: #111; color: #fff; border: none; resize: none;"> </textarea>'; const win = createWindow(null, "Text Editor", content0);`
};

let wallpaper_url = localStorage.getItem("webTestOS_Wallpaper");
if (wallpaper_url) {
  document.body.style.backgroundImage = `url('${wallpaper_url}')`;
  document.body.style.backgroundSize = "100% 100%";
  document.body.style.backgroundRepeat = "no-repeat";
  document.body.style.backgroundPosition = "center";
  document.body.style.imageRendering = "auto";
  document.body.style.backgroundAttachment = "fixed";
}

const params = new URLSearchParams(location.search);
const dirParam = params.get("dir");  

const colorMap = {
  '0': "#000000", '1': "#0000AA", '2': "#00AA00", '3': "#00AAAA",
  '4': "#AA0000", '5': "#AA00AA", '6': "#AAAA00", '7': "#AAAAAA",
  '8': "#555555", '9': "#5555FF", 'A': "#55FF55", 'B': "#55FFFF",
  'C': "#FF5555", 'D': "#FF55FF", 'E': "#FFFF55", 'F': "#FFFFFF"
};

if (dirParam) {
  try {
    const restored = JSON.parse(decodeURIComponent(dirParam));
    if (typeof restored === "object") {
      fileSystem = restored;
      localStorage.setItem("webTestOS_FS", JSON.stringify(fileSystem));
      location.href = `${location.origin}${location.pathname}`;
    }
  } catch (e) {
    console.error("Failed to parse backup dir:", e);
  }
}

const commands = {
  help() {
    const baseCommands = Object.keys(commands).filter(k => k !== "timer");
    const timerCommands = Object.keys(commands.timer).map(sub => `timer ${sub}`);
    return `Commands: ${[...baseCommands, ...timerCommands].join(', ')}`;
  },  
  echo(args) {
    return args.join(" ");
  },
  clear() {
    terminal.innerHTML = '';
    return null;
  },
  date() {
    return new Date().toString();
  },
  wallpaper(args) {
    const url = args.join(" ");
    localStorage.setItem("webTestOS_Wallpaper", url)
    document.body.style.backgroundImage = `url('${url}')`;
    document.body.style.backgroundSize = "100% 100%";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.imageRendering = "auto";
    document.body.style.backgroundAttachment = "fixed";
    return "...";
  },
  color(args) {
    const hex = (args[0] || "").toUpperCase();
  
    if (!hex || hex.length !== 2) {
      document.body.style.backgroundColor = "#000";
      document.body.style.color = "#FFF";
      return "Color reset to default.";
    }
  
    const bg = hex[0];
    const fg = hex[1];
  
    if (bg === fg) return "Error: Background and foreground colors cannot be the same.";
  
    const bgColor = colorMap[bg];
    const fgColor = colorMap[fg];
  
    if (!bgColor || !fgColor) return "Invalid color code.";
  
    document.body.style.backgroundColor = bgColor;
    document.body.style.color = fgColor;
  
    return `Color set to ${hex} (BG: ${bgColor}, FG: ${fgColor})`;
  },  

  timer: {
    start() {
      startTime = Date.now();
      timerInterval = setInterval(() => {
        elapsed = (Date.now() - startTime) / 1000;
      }, 1);
      return "Timer started!";
    },

    show() {
      return`Timer: ${elapsed}s`;
    },

    stop() {
      clearInterval(timerInterval);
      return "Timer stopped.";
    },

    reset() {
      startTime = Date.now();
      elapsed = 0;
      return "Timer reset.";
    }
  },
  dir() {
    return Object.keys(fileSystem)
        .map(file => `[ .${file.split('.').pop()} ] ${file}`)
        .join("\n");
  },

  type(args) {
    const file = args.join(" ");
    if (!fileSystem[file]) return `File not found: ${file}`;
    return fileSystem[file];
  },

  read(args) {
    const file = args.join(" ");
    if (!fileSystem[file]) return `File not found: ${file}`;

    return fileSystem[file];
  },

  delete(args) {
    const file = args.join(" ");
    if (!fileSystem[file]) return `File not found: ${file}`;
  
    delete fileSystem[file];
    return `Deleted: ${file}`;
  },

  open(args) {
    const file = args.join(" ");
    const content = fileSystem[file];
    if (!content) return `File not found: ${file}`;

    if (file.endsWith(".ws")) {
      const lines = content.split(/[,;\n]/).map(l => l.trim()).filter(l => l);
      lines.forEach(cmd => processCommand(cmd));
      return `...`;
    }

    if (file.endsWith(".js")) {
      eval(content);
      return `...`;
    }

    return "Unsupported file type.";
  },

  create(args) {
    const fileName = args[0];
    const content = args.slice(1).join(" ");
    
    if (!fileName || !content) return "Error: Please specify a filename and content.";
    fileSystem[fileName] = content;
    return `File ${fileName} created with content: ${content}`;
  },

  backup(args) {
    const encoded = encodeURIComponent(JSON.stringify(fileSystem));
    return `Backup URL:\n${location.origin}${location.pathname}?dir=${encoded}`;
  },
};

function bootOS() {
    terminal = document.getElementById('terminal');
    terminal.focus();

    Object.values(colorMap).forEach(function(color) {
      writeColor(color);
    });

    writeLine("[ Verifying ] Files...", "#00FF00");
  
    let threats = 0;
    const signatures = ["atob(", "document", "XMLHttpRequest"];
  
    for (const [filename, content] of Object.entries(fileSystem)) {
      let threatDetected = false;
  
      for (const sig of signatures) {
        if (content.includes(sig)) {
          writeLine(`[ Threat in ${filename} ] ➤ Pattern: "${sig}"`, "red");
          threatDetected = true;
          threats++;
          break;
        }
      }
  
      if (!threatDetected) {
        writeLine(`[ ${filename} ] - Clean ✔, "lime"`);
      }
    }
  
    writeLine(" ");
    writeLine("WebTest OS", "cyan");
    writeLine("Type 'help' to begin.", "#AAAAFF");
    // writeLine("Login to WebTest OS")
    // writeLine("Password: ")
    writeLine(" ");
    newPrompt();
    terminal.tabIndex = 0;

    terminal.addEventListener('keydown', handleKey);
  }  

function focusWindow(window) {
    const allWindows = document.querySelectorAll('.window');
    allWindows.forEach(win => {
      win.style.zIndex = 1;
    });
    window.style.zIndex = 1000;
  }

function addTaskToTaskbar(icon, title, window) {
    const taskItem = document.createElement('div');
    taskItem.classList.add('task-item');
    taskItem.innerHTML = `
      <img src="${icon}" alt="${title}" />
      ${title}`;
  
    taskItem.onclick = () => focusWindow(window);
  
    taskbar.appendChild(taskItem);
  
    return taskItem;
  }  

function createWindow(icon, title, innerHTML) {
  if (!icon) { icon = 'https://media.discordapp.net/attachments/1321842198991343727/1363537296313417779/expand.png?ex=68066490&is=68051310&hm=c10c3049a5979cdc9ad21d9b093551ebabad064ac81cb8c10fc6094b5f815cb0&=&format=webp&quality=lossless' };
  const win = document.createElement("div");
  win.classList.add("window");
  win.style.position = "fixed";
  win.style.left = "100px";
  win.style.top = "100px";
  win.style.width = "400px";
  win.style.height = "300px";
  win.style.background = "#222";
  win.style.border = "1px solid #555";
  win.style.borderRadius = "5px";
  win.style.color = "#fff";
  win.style.padding = "10px";
  win.style.zIndex = 1000;
  win.style.boxShadow = "0 0 20px #000";
  win.style.zIndex = 1001;

  win.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px; cursor: move; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 5px">
        <img src="${icon}" alt="" style="width: 32px; height: 32px;" />
        <span>${title}</span>
      </div>
      <button style="background:none; color:#f00; border:none;">[X]</button>
    </div>
    <div style="height: calc(100% - 30px); overflow: hidden;">${innerHTML}</div>`
  ;

  document.body.appendChild(win);

  const wintaskbar = addTaskToTaskbar(icon, title, win);

  const closeButton = win.querySelector("button");
  closeButton.onclick = () => {
    win.remove()
    wintaskbar.remove()
  };  

  let isDragging = false, offsetX = 0, offsetY = 0;
  const header = win.firstElementChild;

  header.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
  };
  
  document.onmouseup = () => isDragging = false;
  
  document.onmousemove = (e) => {
    if (isDragging) {
      win.style.left = `${e.clientX - offsetX}px`;
      win.style.top = `${e.clientY - offsetY}px`;
    }
  };
  
  return win;  
}    

async function handleKey(e) {
  if (e.ctrlKey && e.key.toLowerCase() === "v") {
    // Paste handler
    try {
      const text = await navigator.clipboard.readText();
      inputLine = inputLine.slice(0, cursorPosition) + text + inputLine.slice(cursorPosition);
      cursorPosition += text.length;
    } catch (err) {
      console.error("Clipboard read failed:", err);
    }
  } else if (e.key.length === 1 && !e.ctrlKey) {
    inputLine = inputLine.slice(0, cursorPosition) + e.key + inputLine.slice(cursorPosition);
    cursorPosition++;
  } else if (e.key === "Backspace") {
    if (cursorPosition > 0) {
      inputLine = inputLine.slice(0, cursorPosition - 1) + inputLine.slice(cursorPosition);
      cursorPosition--;
    }
  } else if (e.key === "Delete") {
    if (cursorPosition < inputLine.length) {
      inputLine = inputLine.slice(0, cursorPosition) + inputLine.slice(cursorPosition + 1);
    }
  } else if (e.key === "Enter") {
    removeCursor();
    processCommand(inputLine.trim());
    inputLine = '';
    cursorPosition = 0;
  } else if (e.key === "ArrowLeft") {
    if (cursorPosition > 0) cursorPosition--;
  } else if (e.key === "ArrowRight") {
    if (cursorPosition < inputLine.length) cursorPosition++;
  } else if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex--;
      inputLine = history[historyIndex];
      cursorPosition = inputLine.length;
    }
  } else if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      inputLine = history[historyIndex];
      cursorPosition = inputLine.length;
    }
  } else if (e.key === "Home") {
    cursorPosition = 0;
  } else if (e.key === "End") {
    cursorPosition = inputLine.length;
  }

  updatePrompt();
  e.preventDefault();
}

function writeColor(color = "#0ff", size = "50px") {
    const block = document.createElement("div");
    block.style.background = color;
    block.style.width = size;
    block.style.height = size;
    block.style.display = "inline-block";
    block.style.margin = "4px";
  
    terminal.appendChild(block);
  }  

function writeLine(text, color = "white") {
  const line = document.createElement("div");
  line.textContent = text;

  if (color) {
    line.style.color = color;
  }

  terminal.appendChild(line);
}

function newPrompt() {
  const line = document.createElement("div");
  line.className = 'line';
  terminal.appendChild(line);
  window.scrollTo(0, document.body.scrollHeight);
  updatePrompt();
}

function removeCursor() {
  const prompt = terminal.querySelector(".line:last-child");
  if (prompt) {
      const cursor = prompt.querySelector('.cursor');
      if (cursor) {
          cursor.remove();
      }
  }
}

function updatePrompt() {
  const prompt = terminal.querySelector(".line:last-child");
  if (prompt) {
      prompt.innerHTML = '';
      
      prompt.appendChild(document.createTextNode("> "));
      
      const beforeCursor = document.createTextNode(inputLine.slice(0, cursorPosition));
      const afterCursor = document.createTextNode(inputLine.slice(cursorPosition));
      
      prompt.appendChild(beforeCursor);
      
      if (!document.querySelector('.processing')) {
          const cursorSpan = document.createElement('span');
          cursorSpan.className = 'cursor';
          showUnderscore = !showUnderscore
          cursorSpan.textContent = (showUnderscore) ? '|' : '_';
          prompt.appendChild(cursorSpan);
      }
      
      prompt.appendChild(afterCursor);
  }
}

function processCommand(cmdLine) {
    const [cmd, ...args] = cmdLine.split(" ");
    let func;
  
    if (cmd === "timer" && args.length > 0) {
      const subcmd = args.shift();
      func = commands.timer[subcmd];
    } else {
      func = commands[cmd];
    }
  
    if (typeof func === "function") {
      const output = func(args);
      if (output !== null) writeLine(output);
    } else {
      writeLine("Unknown command: " + cmdLine);
    }
  
    history.push(cmdLine); 
    historyIndex = history.length;
    newPrompt();

    localStorage.setItem("webTestOS_FS", JSON.stringify(fileSystem));   
  }

    localStorage.setItem("webTestOS_FS", JSON.stringify(fileSystem));   
  }
