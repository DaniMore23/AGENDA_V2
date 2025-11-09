const STORAGE_KEY = "sleepAgenda";

const dateSelect = document.getElementById("date-select");
const sleepStartInput = document.getElementById("sleep-start");
const sleepEndInput = document.getElementById("sleep-end");
const sleepList = document.getElementById("sleep-list");
const bottleTimeInput = document.getElementById("bottle-time");
const bottleAmountInput = document.getElementById("bottle-amount");
const bottleList = document.getElementById("bottle-list");
const addSleepBtn = document.getElementById("add-sleep");
const addBottleBtn = document.getElementById("add-bottle");
const timelineTable = document.getElementById("timeline-table");
const historyStartInput = document.getElementById("history-start");
const historyEndInput = document.getElementById("history-end");
const generateHistoryBtn = document.getElementById("generate-history");

let data = loadData();
let historyChart = null;

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    console.warn("No se pudo cargar la información almacenada", error);
    return {};
  }
}

function persistData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayISO() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const local = new Date(today.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
}

function ensureDateExists(date) {
  if (!data[date]) {
    data[date] = { sleep: [], bottles: [] };
  }
}

function formatTimeLabel(value) {
  if (!value) return "";
  const [h, m] = value.split(":");
  return `${h}:${m}`;
}

function formatDateLabel(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function parseMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function durationInHours(start, end) {
  let startMinutes = parseMinutes(start);
  let endMinutes = parseMinutes(end);
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  return (endMinutes - startMinutes) / 60;
}

function getSelectedDate() {
  return dateSelect.value || todayISO();
}

function renderLists() {
  const date = getSelectedDate();
  ensureDateExists(date);
  const { sleep, bottles } = data[date];

  sleepList.innerHTML = "";
  sleep.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>Durmió de <strong>${formatTimeLabel(entry.start)}</strong> a <strong>${formatTimeLabel(entry.end)}</strong></span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "×";
    button.title = "Eliminar";
    button.addEventListener("click", () => {
      sleep.splice(index, 1);
      persistData();
      renderLists();
      renderTimeline();
    });
    li.appendChild(button);
    sleepList.appendChild(li);
  });

  bottleList.innerHTML = "";
  bottles.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${formatTimeLabel(entry.time)} — <strong>${entry.amount} ml</strong></span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "×";
    button.title = "Eliminar";
    button.addEventListener("click", () => {
      bottles.splice(index, 1);
      persistData();
      renderLists();
      renderTimeline();
    });
    li.appendChild(button);
    bottleList.appendChild(li);
  });
}

function buildTableHeader() {
  const theadRow = timelineTable.tHead.rows[0];
  theadRow.innerHTML = "";
  const dayCell = document.createElement("th");
  dayCell.textContent = "Día";
  dayCell.scope = "col";
  theadRow.appendChild(dayCell);

  for (let hour = 0; hour < 24; hour += 1) {
    const cell = document.createElement("th");
    cell.textContent = hour.toString().padStart(2, "0");
    theadRow.appendChild(cell);
  }
}

function renderTimeline() {
  buildTableHeader();
  const tbody = timelineTable.tBodies[0];
  tbody.innerHTML = "";
  const dates = Object.keys(data).sort((a, b) => (a < b ? 1 : -1));
  dates.forEach((date) => {
    const row = document.createElement("tr");
    const dayHeader = document.createElement("th");
    dayHeader.scope = "row";
    dayHeader.textContent = formatDateLabel(date);
    row.appendChild(dayHeader);

    const sleepEntries = [];
    data[date].sleep.forEach((entry) => {
      let start = parseMinutes(entry.start);
      let end = parseMinutes(entry.end);

      if (end <= start) {
        sleepEntries.push({ start, end: 24 * 60 });
        sleepEntries.push({ start: 0, end });
      } else {
        sleepEntries.push({ start, end });
      }
    });

    const bottleEntries = data[date].bottles.map((entry) => ({
      minutes: parseMinutes(entry.time),
      amount: entry.amount,
      time: entry.time
    }));

    for (let hour = 0; hour < 24; hour += 1) {
      const cell = document.createElement("td");
      const hourStart = hour * 60;
      const hourEnd = (hour + 1) * 60;

      const isSleeping = sleepEntries.some((entry) => entry.start < hourEnd && entry.end > hourStart);
      if (isSleeping) {
        const block = document.createElement("span");
        block.className = "sleep-block";
        cell.appendChild(block);
      }

      const cellBottles = bottleEntries.filter((entry) => entry.minutes >= hourStart && entry.minutes < hourEnd);
      cellBottles.forEach((entry, index) => {
        const indicator = document.createElement("span");
        indicator.className = "bottle-indicator";
        indicator.textContent = "🍼";
        indicator.title = `${formatTimeLabel(entry.time)} · ${entry.amount} ml`;
        const offset = (index - (cellBottles.length - 1) / 2) * 16;
        indicator.style.transform = `translate(-50%, -50%) translateX(${offset}px)`;
        cell.appendChild(indicator);
      });

      row.appendChild(cell);
    }
    tbody.appendChild(row);
  });
}

function onAddSleep() {
  const date = getSelectedDate();
  const start = sleepStartInput.value;
  const end = sleepEndInput.value;

  if (!start || !end) {
    alert("Introduce la hora de inicio y fin del sueño.");
    return;
  }

  const startMinutes = parseMinutes(start);
  const endMinutes = parseMinutes(end);
  if (startMinutes === endMinutes) {
    alert("Las horas no pueden ser iguales.");
    return;
  }

  ensureDateExists(date);
  data[date].sleep.push({ start, end });
  data[date].sleep.sort((a, b) => (a.start < b.start ? -1 : 1));
  persistData();
  renderLists();
  renderTimeline();
  sleepStartInput.value = "";
  sleepEndInput.value = "";
}

function onAddBottle() {
  const date = getSelectedDate();
  const time = bottleTimeInput.value;
  const amount = Number(bottleAmountInput.value);

  if (!time || !amount) {
    alert("Introduce la hora y la cantidad tomada.");
    return;
  }

  ensureDateExists(date);
  data[date].bottles.push({ time, amount });
  data[date].bottles.sort((a, b) => (a.time < b.time ? -1 : 1));
  persistData();
  renderLists();
  renderTimeline();
  bottleTimeInput.value = "";
  bottleAmountInput.value = "";
}

function generateHistory() {
  const start = historyStartInput.value;
  const end = historyEndInput.value;

  if (!start || !end) {
    alert("Selecciona la fecha de inicio y fin.");
    return;
  }

  if (end < start) {
    alert("La fecha final debe ser posterior a la inicial.");
    return;
  }

  const filteredDates = Object.keys(data)
    .filter((date) => date >= start && date <= end)
    .sort((a, b) => (a < b ? -1 : 1));

  if (!filteredDates.length) {
    alert("No hay registros en el rango seleccionado.");
    return;
  }

  const labels = [];
  const sleepHours = [];
  const bottleAmounts = [];

  filteredDates.forEach((date) => {
    const dayData = data[date];
    const totalSleep = dayData.sleep.reduce((acc, entry) => acc + durationInHours(entry.start, entry.end), 0);
    const totalBottle = dayData.bottles.reduce((acc, entry) => acc + Number(entry.amount), 0);
    labels.push(formatDateLabel(date));
    sleepHours.push(Number(totalSleep.toFixed(2)));
    bottleAmounts.push(totalBottle);
  });

  const ctx = document.getElementById("history-chart");

  if (historyChart) {
    historyChart.destroy();
  }

  historyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "line",
          label: "Horas de sueño",
          data: sleepHours,
          borderColor: "#4f6ef7",
          backgroundColor: "rgba(79, 110, 247, 0.25)",
          tension: 0.3,
          yAxisID: "y"
        },
        {
          type: "bar",
          label: "Cantidad de biberón (ml)",
          data: bottleAmounts,
          backgroundColor: "rgba(255, 179, 71, 0.7)",
          borderRadius: 6,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          position: "left",
          beginAtZero: true,
          title: {
            display: true,
            text: "Horas"
          }
        },
        y1: {
          position: "right",
          beginAtZero: true,
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: "Mililitros"
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              if (context.dataset.yAxisID === "y") {
                return `${context.dataset.label}: ${context.formattedValue} h`;
              }
              return `${context.dataset.label}: ${context.formattedValue} ml`;
            }
          }
        },
        legend: {
          labels: {
            usePointStyle: true
          }
        }
      }
    }
  });
}

function initDateInputs() {
  const today = todayISO();
  dateSelect.value = today;
  historyStartInput.value = today;
  historyEndInput.value = today;
}

function init() {
  initDateInputs();
  renderLists();
  renderTimeline();

  dateSelect.addEventListener("change", () => {
    renderLists();
    renderTimeline();
  });

  addSleepBtn.addEventListener("click", (event) => {
    event.preventDefault();
    onAddSleep();
  });

  addBottleBtn.addEventListener("click", (event) => {
    event.preventDefault();
    onAddBottle();
  });

  generateHistoryBtn.addEventListener("click", (event) => {
    event.preventDefault();
    generateHistory();
  });
}

init();
