import React, { useEffect, useState } from 'react';
import XPTooltip from 'components/XPTooltip';

const getTime = () => {
  const date = new Date();
  let hour = date.getHours();
  let hourPostFix = 'AM';
  let min = date.getMinutes();
  if (hour >= 12) {
    hour -= 12;
    hourPostFix = 'PM';
  }
  if (hour === 0) {
    hour = 12;
  }
  if (min < 10) {
    min = '0' + min;
  }
  return `${hour}:${min} ${hourPostFix}`;
};

const getLongDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

/** The tray clock, with the full date as its tooltip. */
export default function Clock() {
  const [time, setTime] = useState(getTime);
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = getTime();
      if (newTime !== time) setTime(newTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [time]);
  return (
    <XPTooltip text={getLongDate()}>
      <div className="footer__time">{time}</div>
    </XPTooltip>
  );
}
