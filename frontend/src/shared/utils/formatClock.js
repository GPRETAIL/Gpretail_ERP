const pad = (value) => String(value).padStart(2, "0");

/** "11:03:30" and "PM" for a time, "12/11/2026" (dd/mm/yyyy) for its date. */
export const formatClock = (date) => {
  const hours = date.getHours();
  return {
    time: `${pad(hours % 12 || 12)}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    meridiem: hours < 12 ? "AM" : "PM",
    date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};
