import React, { useMemo } from "react";
import "./StarBackground.css";

/**
 * 可调参数：
 * - count: 星星数量
 * - minSize/maxSize: 星点像素大小范围
 * - minDur/maxDur: 闪烁时长范围（秒）
 */
export default function StarBackground({
  count = 100,
  minSize = 1.5,
  maxSize = 3.5,
  minDur = 1.5,
  maxDur = 3.0,
}) {
  // 用 useMemo 确保每次渲染不重新随机（页面刷新才会变）
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const size = rand(minSize, maxSize);                     // 随机尺寸
      const top = rand(0, 100);                                // 0-100 vh
      const left = rand(0, 100);                               // 0-100 vw
      const delay = rand(0, 2);                                // 延迟 0-2s
      const duration = rand(minDur, maxDur);                   // 动画时长
      const opacity = rand(0.4, 1);                            // 初始透明度
      arr.push({ size, top, left, delay, duration, opacity });
    }
    return arr;
  }, [count, minSize, maxSize, minDur, maxDur]);

  return (
    <div className="star-bg" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            top: `${s.top}vh`,
            left: `${s.left}vw`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
