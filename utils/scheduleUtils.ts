import { BlockerSchedule } from '@/types/blocker';

/**
 * Проверяет, попадает ли текущий момент в указанное расписание
 */
export function isWithinSchedule(schedule: BlockerSchedule): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0-6, где 0 - воскресенье
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Проверяем, входит ли текущий день в расписание
  if (!schedule.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Парсим время начала и окончания
  const [startHours, startMinutes] = schedule.startTime.split(':').map(Number);
  const [endHours, endMinutes] = schedule.endTime.split(':').map(Number);
  
  const startTimeInMinutes = startHours * 60 + startMinutes;
  const endTimeInMinutes = endHours * 60 + endMinutes;

  // Проверяем, попадает ли текущее время в диапазон
  // Учитываем случай, когда расписание переходит через полночь (например, 22:00 - 06:00)
  if (startTimeInMinutes <= endTimeInMinutes) {
    // Обычный случай: время начала раньше времени окончания (09:00 - 17:00)
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  } else {
    // Переход через полночь: время начала позже времени окончания (22:00 - 06:00)
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  }
}

/**
 * Рассчитывает время в миллисекундах до начала следующего окна расписания
 */
export function getMillisecondsUntilScheduleStart(schedule: BlockerSchedule): number | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const [startHours, startMinutes] = schedule.startTime.split(':').map(Number);
  const startTimeInMinutes = startHours * 60 + startMinutes;

  // Сортируем дни недели
  const sortedDays = [...schedule.daysOfWeek].sort((a, b) => a - b);
  
  if (sortedDays.length === 0) {
    return null;
  }

  // Ищем ближайший день, когда расписание активно
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const targetDay = (currentDay + daysAhead) % 7;
    
    if (sortedDays.includes(targetDay)) {
      // Если это сегодня и время начала ещё не наступило
      if (daysAhead === 0 && currentTimeInMinutes < startTimeInMinutes) {
        const minutesUntilStart = startTimeInMinutes - currentTimeInMinutes;
        return (minutesUntilStart * 60 - currentSeconds) * 1000;
      }
      
      // Если это другой день
      if (daysAhead > 0) {
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const millisecondsUntilMidnight = 
          ((24 - currentHours - 1) * 60 + (60 - currentMinutes - 1)) * 60 * 1000 + 
          (60 - currentSeconds) * 1000;
        const millisecondsFromMidnightToStart = startTimeInMinutes * 60 * 1000;
        
        return millisecondsUntilMidnight + 
               (daysAhead - 1) * millisecondsPerDay + 
               millisecondsFromMidnightToStart;
      }
    }
  }

  return null;
}

/**
 * Рассчитывает время в миллисекундах до окончания текущего окна расписания
 */
export function getMillisecondsUntilScheduleEnd(schedule: BlockerSchedule): number | null {
  if (!isWithinSchedule(schedule)) {
    return null;
  }

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const [endHours, endMinutes] = schedule.endTime.split(':').map(Number);
  const endTimeInMinutes = endHours * 60 + endMinutes;

  const [startHours, startMinutes] = schedule.startTime.split(':').map(Number);
  const startTimeInMinutes = startHours * 60 + startMinutes;

  // Случай перехода через полночь
  if (startTimeInMinutes > endTimeInMinutes) {
    if (currentTimeInMinutes >= startTimeInMinutes) {
      // Мы после начала, но до полуночи - считаем до конца следующего дня
      const minutesUntilMidnight = 24 * 60 - currentTimeInMinutes;
      const minutesUntilEnd = minutesUntilMidnight + endTimeInMinutes;
      return (minutesUntilEnd * 60 - currentSeconds) * 1000;
    } else {
      // Мы после полуночи, но до конца
      const minutesUntilEnd = endTimeInMinutes - currentTimeInMinutes;
      return (minutesUntilEnd * 60 - currentSeconds) * 1000;
    }
  }

  // Обычный случай
  const minutesUntilEnd = endTimeInMinutes - currentTimeInMinutes;
  return (minutesUntilEnd * 60 - currentSeconds) * 1000;
}

/**
 * Форматирует оставшееся время до начала расписания
 */
export function formatTimeUntilStart(schedule: BlockerSchedule): string {
  const ms = getMillisecondsUntilScheduleStart(schedule);
  if (ms === null) return '';

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
