const STORAGE_KEY = 'agendaSuenoBebe';
const HALF_HOUR = 30;

const state = {
  data: loadData(),
  selectedDay: null,
  historyChart: null,
  lastHistoryRange: null,
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { days: {} };
    }
    const parsed = JSON.parse(saved);
    if (!parsed.days) {
      return { days: {} };
    }
    return parsed;
  } catch (error) {
    console.warn('No se pudieron cargar los datos guardados:', error);
    return { days: {} };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function ensureDay(dateKey) {
  if (!state.data.days[dateKey]) {
    state.data.days[dateKey] = { sleepSessions: [], bottles: [] };
  }
  return state.data.days[dateKey];
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeStringToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const parts = [];
  if (hrs > 0) {
    parts.push(`${hrs} h`);
  }
  if (mins > 0 || parts.length === 0) {
    parts.push(`${mins} min`);
  }
  return parts.join(' ');
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
}

document.addEventListener('DOMContentLoaded', () => {
  const dayPicker = document.getElementById('day-picker');
  const hourLabels = document.getElementById('hour-labels');
  const timeline = document.getElementById('timeline');
  const sleepForm = document.getElementById('sleep-form');
  const bottleForm = document.getElementById('bottle-form');
  const sleepList = document.getElementById('sleep-list');
  const bottleList = document.getElementById('bottle-list');
  const summarySleep = document.getElementById('summary-sleep');
  const summaryBottle = document.getElementById('summary-bottle');
  const historyForm = document.getElementById('history-form');
  const historySummary = document.getElementById('history-summary');
  const historyStart = document.getElementById('history-start');
  const historyEnd = document.getElementById('history-end');
  const historyChartCanvas = document.getElementById('history-chart');

  // Build hour labels spanning two half-hour slots each
  for (let hour = 0; hour < 24; hour += 1) {
    const label = document.createElement('div');
    label.textContent = `${String(hour).padStart(2, '0')} h`;
    label.style.gridColumn = `${hour * 2 + 1} / span 2`;
    hourLabels.appendChild(label);
  }

  const todayKey = toDateInputValue(new Date());
  dayPicker.value = todayKey;
  state.selectedDay = todayKey;
  renderDay(todayKey);

  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 6);
  historyStart.value = toDateInputValue(defaultStart);
  historyEnd.value = todayKey;

  dayPicker.addEventListener('change', () => {
    const dateKey = dayPicker.value;
    state.selectedDay = dateKey;
    renderDay(dateKey);
  });

  sleepForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.selectedDay) return;

    const startValue = sleepForm.querySelector('#sleep-start').value;
    const endValue = sleepForm.querySelector('#sleep-end').value;
    if (!startValue || !endValue) {
      return;
    }
    const startMinutes = timeStringToMinutes(startValue);
    const endMinutes = timeStringToMinutes(endValue);

    if (endMinutes <= startMinutes) {
      alert('La hora de despertar debe ser posterior a la hora de dormir.');
      return;
    }

    const dayData = ensureDay(state.selectedDay);
    dayData.sleepSessions.push({ start: startMinutes, end: endMinutes });
    dayData.sleepSessions.sort((a, b) => a.start - b.start);
    saveData();
    sleepForm.reset();
    renderDay(state.selectedDay);
    refreshHistory();
  });

  bottleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.selectedDay) return;

    const timeValue = bottleForm.querySelector('#bottle-time').value;
    const amountValue = bottleForm.querySelector('#bottle-amount').value;

    if (!timeValue || !amountValue) {
      return;
    }

    const amount = Number(amountValue);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Introduce una cantidad válida de leche en mililitros.');
      return;
    }

    const dayData = ensureDay(state.selectedDay);
    dayData.bottles.push({ time: timeStringToMinutes(timeValue), quantity: amount });
    dayData.bottles.sort((a, b) => a.time - b.time);
    saveData();
    bottleForm.reset();
    renderDay(state.selectedDay);
    refreshHistory();
  });

  sleepList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="delete-sleep"]');
    if (!button || !state.selectedDay) return;
    const index = Number(button.dataset.index);
    const dayData = ensureDay(state.selectedDay);
    dayData.sleepSessions.splice(index, 1);
    saveData();
    renderDay(state.selectedDay);
    refreshHistory();
  });

  bottleList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="delete-bottle"]');
    if (!button || !state.selectedDay) return;
    const index = Number(button.dataset.index);
    const dayData = ensureDay(state.selectedDay);
    dayData.bottles.splice(index, 1);
    saveData();
    renderDay(state.selectedDay);
    refreshHistory();
  });

  historyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const startDate = historyStart.value;
    const endDate = historyEnd.value;

    if (!startDate || !endDate) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      alert('La fecha final debe ser posterior a la inicial.');
      return;
    }

    renderHistory(startDate, endDate, historyChartCanvas, historySummary);
  });

  function refreshHistory() {
    if (state.lastHistoryRange) {
      renderHistory(state.lastHistoryRange.start, state.lastHistoryRange.end, historyChartCanvas, historySummary, true);
    }
  }

  function renderDay(dateKey) {
    const dayData = ensureDay(dateKey);

    timeline.innerHTML = '';
    const segments = [];
    for (let index = 0; index < 48; index += 1) {
      const segment = document.createElement('div');
      segment.className = 'segment';
      if (index % 2 === 0) {
        segment.dataset.hour = 'true';
      }
      segments.push(segment);
      timeline.appendChild(segment);
    }

    dayData.sleepSessions.forEach((session) => {
      const startIndex = Math.max(0, Math.floor(session.start / HALF_HOUR));
      const endIndex = Math.max(startIndex, Math.min(47, Math.ceil(session.end / HALF_HOUR) - 1));
      for (let i = startIndex; i <= endIndex; i += 1) {
        segments[i].classList.add('sleeping');
      }
      segments[startIndex].classList.add('sleep-start');
      segments[endIndex].classList.add('sleep-end');
    });

    dayData.bottles.forEach((bottle) => {
      const index = Math.min(47, Math.max(0, Math.floor(bottle.time / HALF_HOUR)));
      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.textContent = `${bottle.quantity} ml`;
      segments[index].appendChild(marker);
    });

    sleepList.innerHTML = '';
    if (dayData.sleepSessions.length === 0) {
      sleepList.innerHTML = '<li>No hay registros todavía.</li>';
    } else {
      dayData.sleepSessions.forEach((session, index) => {
        const item = document.createElement('li');
        const duration = session.end - session.start;
        const info = document.createElement('span');
        info.innerHTML = `<strong>${minutesToTimeString(session.start)} → ${minutesToTimeString(session.end)}</strong><small>${formatDuration(duration)}</small>`;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Eliminar';
        deleteButton.setAttribute('data-action', 'delete-sleep');
        deleteButton.dataset.index = index;
        item.append(info, deleteButton);
        sleepList.appendChild(item);
      });
    }

    bottleList.innerHTML = '';
    if (dayData.bottles.length === 0) {
      bottleList.innerHTML = '<li>No hay registros todavía.</li>';
    } else {
      dayData.bottles.forEach((bottle, index) => {
        const item = document.createElement('li');
        const info = document.createElement('span');
        info.innerHTML = `<strong>${minutesToTimeString(bottle.time)}</strong><small>${bottle.quantity} ml</small>`;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Eliminar';
        deleteButton.setAttribute('data-action', 'delete-bottle');
        deleteButton.dataset.index = index;
        item.append(info, deleteButton);
        bottleList.appendChild(item);
      });
    }

    const totalSleepMinutes = dayData.sleepSessions.reduce((acc, session) => acc + (session.end - session.start), 0);
    const totalBottleMl = dayData.bottles.reduce((acc, bottle) => acc + bottle.quantity, 0);

    const sleepHours = (totalSleepMinutes / 60).toFixed(2);
    summarySleep.textContent = `${sleepHours} h`;
    summaryBottle.textContent = `${totalBottleMl} ml`;
  }

  renderHistory(historyStart.value, historyEnd.value, historyChartCanvas, historySummary);
});

function renderHistory(startDateStr, endDateStr, canvas, summaryContainer, silent = false) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (endDate < startDate) {
    if (!silent) {
      alert('La fecha final debe ser posterior a la inicial.');
    }
    return;
  }

  const labels = [];
  const sleepData = [];
  const bottleData = [];
  let totalSleepMinutes = 0;
  let totalBottle = 0;

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateKey = toDateInputValue(cursor);
    labels.push(formatDayLabel(cursor));
    const dayData = state.data.days[dateKey];
    let sleepMinutes = 0;
    let bottleMl = 0;
    if (dayData) {
      sleepMinutes = dayData.sleepSessions.reduce((acc, session) => acc + (session.end - session.start), 0);
      bottleMl = dayData.bottles.reduce((acc, bottle) => acc + bottle.quantity, 0);
    }
    totalSleepMinutes += sleepMinutes;
    totalBottle += bottleMl;
    sleepData.push(Number((sleepMinutes / 60).toFixed(2)));
    bottleData.push(bottleMl);
    cursor.setDate(cursor.getDate() + 1);
  }

  if (state.historyChart) {
    state.historyChart.destroy();
  }

  state.historyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Horas de sueño',
          data: sleepData,
          yAxisID: 'y',
          borderColor: '#5c6bc0',
          backgroundColor: 'rgba(92, 107, 192, 0.25)',
          tension: 0.35,
          fill: false,
          pointRadius: 4,
        },
        {
          type: 'bar',
          label: 'Cantidad biberón (ml)',
          data: bottleData,
          yAxisID: 'y1',
          backgroundColor: 'rgba(255, 152, 0, 0.55)',
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Horas de sueño',
          },
          suggestedMax: 16,
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'Mililitros',
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            usePointStyle: true,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    },
  });

  state.lastHistoryRange = { start: startDateStr, end: endDateStr };

  const daysCount = labels.length;
  const avgSleep = daysCount ? totalSleepMinutes / daysCount : 0;
  const avgBottle = daysCount ? totalBottle / daysCount : 0;

  const lines = [];
  lines.push(`Total de sueño: <strong>${formatDuration(totalSleepMinutes)}</strong>`);
  lines.push(`Total de biberón: <strong>${totalBottle} ml</strong>`);
  lines.push(`Promedio diario de sueño: <strong>${formatDuration(avgSleep)}</strong>`);
  lines.push(`Promedio diario de biberón: <strong>${avgBottle.toFixed(0)} ml</strong>`);
  summaryContainer.innerHTML = lines.map((line) => `<span>${line}</span>`).join('');
}
