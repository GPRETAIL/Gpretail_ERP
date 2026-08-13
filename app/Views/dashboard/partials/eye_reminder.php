<!-- Eye wellness reminder box -->
<div id="eyeReminder" style="display:none; position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #0d6efd; color: white; padding: 12px 18px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); font-weight: 500; font-size: 14px;">
  👁️ Blink your eyes!
</div>

<script>
  const wellnessTips = [
    "👁️ Blink your eyes!",
    "🧠 Look 20ft away for 20 seconds!",
    "💧 Drink some water!",
    "🧘 Take a deep breath.",
    "👣 Stretch your legs!"
  ];

  setInterval(() => {
  const reminder = document.getElementById('eyeReminder');
  const randomTip = wellnessTips[Math.floor(Math.random() * wellnessTips.length)];
  reminder.textContent = randomTip;
  reminder.style.display = 'block';
  reminder.style.opacity = 1;

  setTimeout(() => {
    reminder.style.transition = 'opacity 1s ease';
    reminder.style.opacity = 0;
  }, 5000);

  setTimeout(() => {
    reminder.style.display = 'none';
    reminder.style.transition = '';
  }, 6000);
}, 3600000); // every 1 hour

