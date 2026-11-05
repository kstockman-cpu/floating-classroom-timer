
const timeDisplay = document.getElementById("timeDisplay");
const progressFill = document.getElementById("progressFill");
const statusText = document.getElementById("status");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const customMinutes = document.getElementById("customMinutes");

let totalSeconds = 600;
let remainingSeconds = 600;
let running = false;
let finishTime = null;
let intervalId = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(remainingSeconds);

  const percentage = (remainingSeconds / totalSeconds) * 100;
  progressFill.style.width = `${percentage}%`;

  if (percentage <= 20) {
    progressFill.style.background = "#ff7777";
  } else if (percentage <= 50) {
    progressFill.style.background = "#ffd166";
  } else {
    progressFill.style.background = "#59d6a0";
  }

  if (remainingSeconds === 0) {
    statusText.textContent = "Time is up!";
  } else if (running) {
    statusText.textContent = "Time remaining";
  } else if (remainingSeconds < totalSeconds) {
    statusText.textContent = "Paused";
  } else {
    statusText.textContent = "Ready to start";
  }

  startBtn.textContent = running ? "Pause" : "Start";
  
  const mainFinished =
    document.getElementById("mainFinished");

  if (mainFinished) {
    mainFinished.hidden = remainingSeconds !== 0;
  }

  updateFloatingDisplay();
}

function stopInterval() {
  clearInterval(intervalId);
  intervalId = null;
}

function tick() {
  if (!running) return;

  remainingSeconds = Math.max(
    0,
    Math.ceil((finishTime - Date.now()) / 1000)
  );

  if (remainingSeconds === 0) {
    running = false;
    stopInterval();
    playCompletionSound();
    }

  updateDisplay();
}

function startTimer() {
  if (running || remainingSeconds === 0) return;
  initializeAudio();
  running = true;
  finishTime = Date.now() + remainingSeconds * 1000;
  intervalId = setInterval(tick, 100);
  updateDisplay();
}

function pauseTimer() {
  if (!running) return;

  tick();
  running = false;
  stopInterval();
  updateDisplay();
}

function resetTimer() {
  running = false;
  stopInterval();
  remainingSeconds = totalSeconds;
  updateDisplay();
}

function setDuration(minutes) {
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 999
  ) {
    alert("Please enter a whole number between 1 and 999 minutes.");
    return;
  }

  totalSeconds = minutes * 60;
  resetTimer();

  // Update the selected preset on the main page.
  document.querySelectorAll("[data-minutes]").forEach((button) => {
    button.classList.toggle(
      "selected",
      Number(button.dataset.minutes) === minutes
    );
  });

  // Save the selected duration.
  timerSettings.duration = minutes;
  saveTimerSettings();

  // Synchronize the floating timer's settings.
  syncFloatingSettings();
}

startBtn.addEventListener("click", () => {
  running ? pauseTimer() : startTimer();
});

resetBtn.addEventListener("click", resetTimer);

document.getElementById("mainFinishedReset")
  .addEventListener("click", resetTimer);


document.querySelectorAll("[data-minutes]").forEach((button) => {
  button.addEventListener("click", () => {
    setDuration(Number(button.dataset.minutes));
  });
});

document.getElementById("setCustomBtn")
  .addEventListener("click", () => {
    setDuration(Number(customMinutes.value));
  });

document.getElementById("presentationBtn")
  .addEventListener("click", () => {
    document.body.classList.add("presentation-mode");
  });

document.getElementById("exitPresentation")
  .addEventListener("click", () => {
    document.body.classList.remove("presentation-mode");
  });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.body.classList.remove("presentation-mode");
  }
});

// Check whether floating windows are supported
function checkFloatingSupport() {
  const supported = "documentPictureInPicture" in window;

  if (supported) {
    alert("Success! Your browser supports floating timers.");
  } else {
    alert(
      "Your browser does not currently support floating timers. " +
      "We may need to use another approach."
    );
  }
}

/* =====================================
   FLOATING CLASSROOM TIMER
   ===================================== */

let pipWindow = null;

let pipPreviousSize = null;

const SETTINGS_KEY = "classroomTimerSettings";

let timerSettings = {
  duration: 10,
  sound: false,
  theme: "dark",
  alarmStyle: "classroom",
  volume: 70
};


try {
  const saved = JSON.parse(
    localStorage.getItem(SETTINGS_KEY) || "null"
  );

  if (saved && typeof saved === "object") {
    if (
      Number.isInteger(saved.duration) &&
      saved.duration >= 1 &&
      saved.duration <= 999
    ) {
      timerSettings.duration = saved.duration;
    }

    if (typeof saved.sound === "boolean") {
      timerSettings.sound = saved.sound;
    }

    if (["dark", "light"].includes(saved.theme)) {
      timerSettings.theme = saved.theme;
    }
    
    if (["gentle", "classroom", "urgent"].includes(saved.alarmStyle)) {
      timerSettings.alarmStyle = saved.alarmStyle;
    }

    if (
      Number.isInteger(saved.volume) &&
      saved.volume >= 0 &&
      saved.volume <= 100
    ) {
      timerSettings.volume = saved.volume;
    }
  }
} catch (error) {
  console.warn("Could not load timer settings:", error);
}

function saveTimerSettings() {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(timerSettings)
    );
  } catch (error) {
    console.warn("Could not save timer settings:", error);
  }
}

function syncFloatingSettings() {
  if (!pipWindow || pipWindow.closed) return;

  const doc = pipWindow.document;
  const root = doc.getElementById("floatingTimer");

  if (!root) return;

  root.classList.toggle(
    "light",
    timerSettings.theme === "light"
  );
  
  const isLight = timerSettings.theme === "light";

    doc.documentElement.style.background =
      isLight ? "#f0f4fa" : "#172033";

    doc.body.style.background =
      isLight ? "#f0f4fa" : "#172033";

  doc.getElementById("pipTheme").value =
    timerSettings.theme;

  doc.getElementById("pipSound").checked =
    timerSettings.sound;
  
  doc.getElementById("pipAlarmStyle").value =
    timerSettings.alarmStyle;

  doc.getElementById("pipVolume").value =
    timerSettings.volume;

  doc.getElementById("pipVolumeValue").textContent =
    `${timerSettings.volume}%`;
}

function showFloatingError(message) {
  if (!pipWindow || pipWindow.closed) return;

  const doc = pipWindow.document;
  const error = doc.getElementById("pipCustomError");
  const input = doc.getElementById("pipCustomMinutes");

  if (!error || !input) return;

  error.textContent = message;
  error.hidden = false;

  input.classList.add("invalid");
  input.setAttribute("aria-invalid", "true");
}

function clearFloatingError() {
  if (!pipWindow || pipWindow.closed) return;

  const doc = pipWindow.document;
  const error = doc.getElementById("pipCustomError");
  const input = doc.getElementById("pipCustomMinutes");

  if (!error || !input) return;

  error.textContent = "";
  error.hidden = true;

  input.classList.remove("invalid");
  input.removeAttribute("aria-invalid");
}

async function openFloatingTimer() {
  if (!("documentPictureInPicture" in window)) {
    alert("Floating windows are not supported.");
    return;
  }

  // If already open, bring the window forward.
  if (pipWindow && !pipWindow.closed) {
    pipWindow.focus();
    return;
  }

  try {
    const newWindow =
      await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 340
    });

    pipWindow = newWindow;

    const doc = pipWindow.document;

    // Create the floating timer interface.
    
    doc.body.innerHTML = `
    <main class="floating-timer" id="floatingTimer">
  
        <div id="pipFinished" class="pip-finished" hidden>
          <div class="pip-finished-content">
            <div class="pip-finished-icon">⏰</div>
            <h1>TIME IS UP!</h1>
            <div class="pip-finished-time">00:00</div>
            <button id="pipFinishedReset" type="button">
              Reset Timer
            </button>
          </div>
        </div>

        <div class="floating-display">
        <div id="pipTime" class="pip-time">10:00</div>

        <div class="pip-progress-track">
            <div id="pipProgress"
                class="pip-progress-fill"></div>
        </div>

        <div id="pipStatus" class="pip-status">
            Ready to start
        </div>
        </div>

        <div class="pip-presets">
        <button data-pip-minutes="5">5m</button>
        <button data-pip-minutes="10">10m</button>
        <button data-pip-minutes="15">15m</button>
        <button data-pip-minutes="20">20m</button>
        </div>

        <div class="pip-controls">
        <button id="pipReset">Reset</button>
        <button id="pipStart" class="pip-primary">Start</button>
        <button id="pipPresent">Present</button>
        </div>

        <button id="pipSettingsBtn">⚙ Settings</button>

        <section id="pipSettings" class="pip-settings" hidden>
        <button id="pipCloseSettings" type="button">
          ✕ Close Settings
        </button>
        <label for="pipCustomMinutes">Custom minutes</label>

        
        <div class="pip-custom-row">
        <input
            id="pipCustomMinutes"
            type="text"
            inputmode="decimal"
            value="10"
            placeholder="Minutes"
            aria-describedby="pipCustomError"
        >
        <button id="pipSetCustom">Set</button>
        </div>

        <p
        id="pipCustomError"
        class="pip-error"
        role="alert"
        hidden>
        </p>


        <label class="pip-check-row">
            <input id="pipSound" type="checkbox">
            Play sound when time is up
        </label>
        
        <label for="pipAlarmStyle">Alarm style</label>
        <select id="pipAlarmStyle">
          <option value="gentle">Gentle Chime</option>
          <option value="classroom">Classroom Alert</option>
          <option value="urgent">Urgent Alarm</option>
        </select>

        <div class="pip-volume-header">
          <label for="pipVolume">Alarm volume</label>
          <span id="pipVolumeValue">70%</span>
        </div>

        <input
          id="pipVolume"
          type="range"
          min="0"
          max="100"
          step="5"
          value="70"
        >

        <button id="pipTestSound" type="button">
          Test Sound
        </button>

        <label for="pipTheme">Appearance</label>
        <select id="pipTheme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
        </select>
        </section>

        <button id="pipExitPresent" class="pip-exit">
        Exit Presentation
        </button>

    </main>
    `;

    // Add styling directly to the floating document.
    const style = doc.createElement("style");

    style.textContent = `
      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        font-family: "Segoe UI", Arial, sans-serif;
        background: #172033;
        color: white;
     }
      
      .floating-timer {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 12px;
        overflow: hidden;
        background: #172033;
        color: white;
      }
      
      .floating-display {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        gap: 10px;
        min-width: 0;
      }
      
      .pip-time {
        text-align: center;
        font-size: clamp(36px, 12vw, 90px);
        font-weight: 800;
        line-height: 1.05;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .pip-progress-track {
        height: 14px;
        background: #35445e;
        border-radius: 20px;
        overflow: hidden;
      }

      .pip-progress-fill {
        height: 100%;
        width: 100%;
        background: #59d6a0;
      }

      .pip-status {
        text-align: center;
        color: #bac6d8;
        font-size: 13px;
      }

      .pip-controls {
        display: flex;
        gap: 8px;
      }

      button {
        flex: 1;
        padding: 11px 5px;
        border: 1px solid #46556e;
        border-radius: 9px;
        background: #293952;
        color: white;
        cursor: pointer;
        font: inherit;
      }

      button:hover {
        filter: brightness(1.15);
      }

      .pip-primary {
        background: #59d6a0;
        color: #12243a;
        border-color: #59d6a0;
        font-weight: bold;
      }

      .pip-exit {
        display: none;
      }

      /* Presentation Mode */

      .presentation .pip-controls {
        display: none;
      }
      
      .floating-timer.presentation {
        padding: 12px;
        gap: 0;
        justify-content: center;
      }

      .presentation .floating-display {
        flex: 1;
        min-height: 0;
        justify-content: center;
      }

      .presentation .pip-time {
        font-size: clamp(42px, 17vw, 140px);
        font-weight: 900;
      }

      .presentation .pip-progress-track {
        height: 16px;
      }

      .presentation .pip-status {
        font-size: 14px;
      }

      .presentation .pip-exit {
        display: block;
        flex: none;
        align-self: center;
        margin-top: 10px;
        padding: 6px 12px;
        font-size: 11px;
        opacity: 0.35;
        flex-shrink: 0;
      }

      .presentation .pip-exit:hover,
      .presentation .pip-exit:focus-visible {
        opacity: 1;
      }
        
      .pip-presets {
        display: flex;
        gap: 6px;
      }

      .pip-presets button {
        flex: 1;
        padding: 7px 4px;
        font-size: 12px;
      }

      .pip-presets button.selected {
        border-color: #59d6a0;
        color: #59d6a0;
      }

      .pip-settings {
        position: absolute;
        top: 12px;
        right: 12px;
        bottom: 12px;
        left: 12px;
        z-index: 50;

        padding: 16px;
        border: 1px solid #46556e;
        border-radius: 12px;
        background: #26344c;
        color: white;

        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-auto-rows: max-content;
        align-content: start;
        gap: 12px;

        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }

      .pip-settings[hidden] {
        display: none;
      }

      .pip-custom-row {
        display: flex;
        gap: 8px;
      }

      .pip-custom-row input {
        width: 90px;
        min-width: 0;
      }

      .pip-settings input,
      .pip-settings select {
        padding: 7px;
        border-radius: 6px;
        border: 1px solid #64748b;
      }

      .pip-check-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pip-check-row input {
        width: auto;
      }

      .presentation .pip-presets,
      .presentation .pip-controls,
      .presentation #pipSettingsBtn,
      .presentation .pip-settings {
        display: none;
      }

      /* Light theme */

      .floating-timer.light {
        background: #f0f4fa;
        color: #172033;
      }

      .light .pip-status {
        color: #475569;
      }

      .light .pip-settings {
        background: #e2e8f0;
        color: #172033;
      }
      
  /* Custom duration validation */
      .pip-error {
        margin: 0;
        padding: 9px 11px;
        border-radius: 7px;
        background: #6b202a;
        border: 1px solid #ff7777;
        color: #ffffff;
        font-size: 12px;
        line-height: 1.4;
      }

      .pip-error[hidden] {
        display: none;
      }

      .pip-custom-row input.invalid {
        border: 2px solid #ff7777;
        outline: none;
      }
      
    /* ===== COMPLETE LIGHT THEME ===== */

      .floating-timer.light {
        background: #f0f4fa;
        color: #172033;
      }

      .light .pip-time {
        color: #172033;
      }

      .light .pip-status {
        color: #475569;
      }

      .light .pip-progress-track {
        background: #cbd5e1;
      }

      .light .pip-settings {
        background: #e2e8f0;
        color: #172033;
        border-color: #b6c4d5;
      }

      .light .pip-controls button,
      .light .pip-presets button,
      .light #pipSettingsBtn,
      .light .pip-exit,
      .light #pipSetCustom,
      .light #pipTestSound {
        background: #dce5f0;
        color: #172033;
        border-color: #a7b5c7;
      }

      .light .pip-controls .pip-primary {
        background: #59d6a0;
        color: #12243a;
        border-color: #59d6a0;
      }

      .light .pip-presets button.selected {
        background: #b7ead7;
        color: #145b47;
        border-color: #228567;
        font-weight: bold;
      }

      .light .pip-settings input,
      .light .pip-settings select {
        background: #ffffff;
        color: #172033;
        border-color: #a7b5c7;
      }

      /* Preserve error visibility in Light Mode */

      .light .pip-error {
        background: #fee2e2;
        color: #991b1b;
        border-color: #dc2626;
      }
        
      /* ===== TIME IS UP SCREEN ===== */

      .pip-finished {
        position: absolute;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #a7192d;
        color: #ffffff;
        padding: 15px;
      }

      .pip-finished[hidden] {
        display: none;
      }
      
      .pip-finished-content {
        width: 100%;
        max-width: 600px;
        margin: auto;
        text-align: center;
      }

      .pip-finished-icon {
        font-size: clamp(26px, 7vw, 55px);
      }
      
      .pip-finished h1 {
        margin: 8px 0;
        font-size: clamp(26px, 9vw, 76px);
        line-height: 1.05;
        font-weight: 900;
        overflow-wrap: break-word;
      }

      .pip-finished-time {
        font-size: clamp(22px, 6vw, 45px);
        font-weight: bold;
        margin-bottom: 16px;
      }

      #pipFinishedReset {
        flex: none;
        width: auto;
        min-width: 130px;
        background: #ffffff;
        color: #a7192d;
        border: none;
        font-weight: bold;
        padding: 10px 18px;
      }

      #pipFinishedReset:hover {
        background: #ffe2e2;
      }
      
      /* ===== ALARM SETTINGS ===== */

      .pip-volume-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      #pipVolumeValue {
        font-weight: bold;
        font-variant-numeric: tabular-nums;
      }

      #pipVolume {
        width: 100%;
        padding: 0;
        accent-color: #59d6a0;
        cursor: pointer;
      }

      .light #pipVolume {
        accent-color: #228567;
      }
        
      /* ===== RESPONSIVE LAYOUT ===== */

      .pip-presets,
      .pip-controls {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
        min-width: 0;
      }

      .pip-presets button,
      .pip-controls button {
        min-width: 0;
        padding: 9px 4px;
      }

      #pipSettingsBtn {
        flex: none;
        padding: 9px;
      }

      /* Keep settings controls easy to use */

      .pip-settings button {
        flex: none;
        min-height: 36px;
      }

      .pip-settings select,
      .pip-settings input[type="text"] {
        width: 100%;
        min-width: 0;
      }

      .pip-settings .pip-custom-row input {
        flex: 1;
        width: 0;
      }

      .pip-settings .pip-custom-row button {
        flex: none;
        min-width: 60px;
      }

      /* Make the completion overlay independent of scrolling */

      .pip-finished {
        position: absolute;
        inset: 0;
        z-index: 100;
        overflow-y: auto;
      }

      /* Compact layout for narrow floating windows */

      @media (max-width: 340px) {
        .floating-timer {
          padding: 9px;
          gap: 8px;
        }

        .floating-display {
          gap: 7px;
        }

        .pip-time {
          font-size: clamp(30px, 11vw, 65px);
        }

        .pip-presets button,
        .pip-controls button {
          padding: 7px 3px;
          font-size: 11px;
        }

        #pipSettingsBtn {
          padding: 7px;
          font-size: 11px;
        }

        .pip-settings {
          inset: 7px;
          padding: 10px;
        }
      }

      /* Compact layout for short windows */

      @media (max-height: 300px) {
        .floating-timer {
          padding: 9px;
          gap: 7px;
        }

        .floating-display {
          gap: 6px;
        }

        .pip-time {
          font-size: clamp(30px, 10vw, 65px);
        }

        .pip-progress-track {
          height: 9px;
        }

        .pip-presets button,
        .pip-controls button {
          padding: 6px 3px;
        }

        .pip-settings {
          inset: 6px;
        }
      }
    `;

    doc.head.appendChild(style);

    // Connect the floating controls to
    // our existing countdown functions.
    doc.getElementById("pipStart")
      .addEventListener("click", () => {
        if (running) {
          pauseTimer();
        } else {
          startTimer();
        }
      });

    doc.getElementById("pipReset")
      .addEventListener("click", resetTimer);

    doc.getElementById("pipPresent")
      .addEventListener("click", () => {
        doc.getElementById("floatingTimer")
          .classList.add("presentation");
      });

    doc.getElementById("pipExitPresent")
      .addEventListener("click", () => {
        doc.getElementById("floatingTimer")
          .classList.remove("presentation");
      });

    // Escape exits floating presentation mode.
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        doc.getElementById("floatingTimer")
          .classList.remove("presentation");
      }
    });
    
    doc.getElementById("pipFinishedReset")
      .addEventListener("click", resetTimer);
    
    // Preset buttons
    doc.querySelectorAll("[data-pip-minutes]")
    .forEach((button) => {
        button.addEventListener("click", () => {
        const minutes = Number(button.dataset.pipMinutes);

        setDuration(minutes);

        doc.getElementById("pipCustomMinutes").value =
            minutes;

        clearFloatingError();
        });
    });


      // Settings panel toggle
      
      doc.getElementById("pipCloseSettings")
        .addEventListener("click", () => {
          doc.getElementById("pipSettings").hidden = true;

          if (pipPreviousSize) {
            try {
              pipWindow.resizeTo(
                pipPreviousSize.width,
                pipPreviousSize.height
              );
            } catch (error) {
              console.warn("Could not restore window size:", error);
            }

            pipPreviousSize = null;
          }
        });
      
      doc.getElementById("pipSettingsBtn")
        .addEventListener("click", () => {
          const panel = doc.getElementById("pipSettings");

          if (panel.hidden) {
            pipPreviousSize = {
              width: pipWindow.outerWidth,
              height: pipWindow.outerHeight
            };

            panel.hidden = false;

            try {
              pipWindow.resizeTo(
                Math.max(pipWindow.outerWidth, 400),
                Math.max(pipWindow.outerHeight, 520)
              );
            } catch (error) {
              console.warn("Window resize unavailable:", error);
            }
          } else {
            panel.hidden = true;
          }
        });

      // Custom duration
        
  doc.getElementById("pipSetCustom")
    .addEventListener("click", () => {
      const input = doc.getElementById("pipCustomMinutes");
      const rawValue = input.value.trim();

      clearFloatingError();

      // Empty input
      if (rawValue === "") {
        showFloatingError("Please enter a duration.");
        return;
      }

      // Only whole numbers are allowed
      if (!/^\d+$/.test(rawValue)) {
        showFloatingError(
          "Enter whole minutes only. Letters, decimals, " +
          "and special characters are not allowed."
        );
        return;
      }

      const minutes = Number(rawValue);

      // Check allowed range
      if (
        !Number.isSafeInteger(minutes) ||
        minutes < 1 ||
        minutes > 999
      ) {
        showFloatingError(
          "Duration must be between 1 and 999 minutes."
        );
        return;
      }

      // Valid duration
      setDuration(minutes);

      input.value = minutes;
      clearFloatingError();
    });
    
      doc.getElementById("pipTestSound")
        .addEventListener("click", async () => {
          await initializeAudio();
          playCompletionSound();
        });
      
      doc.getElementById("pipAlarmStyle")
        .addEventListener("change", (event) => {
          timerSettings.alarmStyle = event.target.value;
          saveTimerSettings();
        });

      doc.getElementById("pipVolume")
        .addEventListener("input", (event) => {
          timerSettings.volume = Number(event.target.value);

          doc.getElementById("pipVolumeValue").textContent =
            `${timerSettings.volume}%`;

          saveTimerSettings();
        });

      doc.getElementById("pipCustomMinutes")
      .addEventListener("input", () => {
          clearFloatingError();
      });


          // Completion sound preference
          doc.getElementById("pipSound")
          .addEventListener("change", (event) => {
              timerSettings.sound = event.target.checked;
              saveTimerSettings();
          });

          // Appearance preference
          doc.getElementById("pipTheme")
          .addEventListener("change", (event) => {
              timerSettings.theme = event.target.value;
              saveTimerSettings();
              syncFloatingSettings();
          });

          // Handle closing the floating window.
          pipWindow.addEventListener("pagehide", () => {
          pipWindow = null;
          });

          updateFloatingDisplay();
          syncFloatingSettings();

      } catch (error) {
          alert("Floating timer error: " + error.message);
      }
  }

/* Keep both timer windows synchronized */

function updateFloatingDisplay() {
  if (!pipWindow || pipWindow.closed) return;

  const doc = pipWindow.document;
  
  const finishedScreen =
    doc.getElementById("pipFinished");

  if (finishedScreen) {
    finishedScreen.hidden = remainingSeconds !== 0;
  }

  const time = doc.getElementById("pipTime");
  const progress = doc.getElementById("pipProgress");
  const status = doc.getElementById("pipStatus");
  const start = doc.getElementById("pipStart");

  if (!time || !progress || !status) return;

  time.textContent = formatTime(remainingSeconds);

  const percentage =
    (remainingSeconds / totalSeconds) * 100;

  progress.style.width = `${percentage}%`;

  progress.style.background =
    percentage <= 20 ? "#ff7777" :
    percentage <= 50 ? "#ffd166" :
    "#59d6a0";

  status.textContent =
    remainingSeconds === 0 ? "Time is up!" :
    running ? "Time remaining" :
    remainingSeconds < totalSeconds ? "Paused" :
    "Ready to start";

  if (start) {
    start.textContent = running ? "Pause" : "Start";
    start.disabled = remainingSeconds === 0;
  }
  
  // Highlight the preset matching the actual timer duration.
  doc.querySelectorAll("[data-pip-minutes]").forEach((button) => {
    const presetSeconds = Number(button.dataset.pipMinutes) * 60;

    button.classList.toggle(
      "selected",
      totalSeconds === presetSeconds
    );
  });
}

let audioContext = null;

async function initializeAudio() {
  if (!timerSettings.sound) return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch (error) {
    console.warn("Audio initialization failed:", error);
  }
}



function playCompletionSound() {
  if (!timerSettings.sound || !audioContext) return;

  try {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const volume = timerSettings.volume / 100;

    if (volume === 0) return;

    function beep(frequency, startOffset, duration, type = "sine") {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      const startTime = now + startOffset;
      const endTime = startTime + duration;

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      // Short fades prevent clicks between beeps.
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(
        volume * 0.12,
        startTime + 0.015
      );
      gain.gain.setValueAtTime(
        volume * 0.12,
        Math.max(startTime + 0.015, endTime - 0.04)
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        endTime
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime + 0.01);
    }

    switch (timerSettings.alarmStyle) {
      case "gentle":
        // Three soft ascending notes, repeated twice.
        for (let group = 0; group < 2; group++) {
          beep(523, group * 1.2, 0.35, "sine");
          beep(659, group * 1.2 + 0.38, 0.35, "sine");
          beep(784, group * 1.2 + 0.76, 0.4, "sine");
        }
        break;

      case "urgent":
        // Alternating high-low alarm, repeated 12 times.
        for (let i = 0; i < 12; i++) {
          beep(
            i % 2 === 0 ? 1100 : 650,
            i * 0.32,
            0.25,
            "square"
          );
        }
        break;

      case "classroom":
      default:
        // Your current three groups of three beeps.
        const frequencies = [880, 1100, 880];

        for (let group = 0; group < 3; group++) {
          for (let i = 0; i < 3; i++) {
            beep(
              frequencies[i],
              group * 1.15 + i * 0.28,
              0.21,
              "square"
            );
          }
        }
        break;
    }
  } catch (error) {
    console.warn("Sound playback failed:", error);
  }
}

// Initialize after all variables are declared.
// Restore saved duration on startup.
setDuration(timerSettings.duration);
